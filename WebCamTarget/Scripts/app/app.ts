declare var Webcam: any;

class ScreenPoint {
    public x: number;
    public y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class WebCamTargetApp {

    private FRAME_RATE: number = 200;
    private SELECTION_SIDE: number = 32;
    private TRESHOLD_COEFFICIENT: number = 5;

    private canvas: HTMLCanvasElement;
    private selectionCanvas: HTMLCanvasElement;

    private startButton: HTMLButtonElement;
    private outputText: HTMLParagraphElement;
    private digit: HTMLHeadingElement;
    private camera: HTMLDivElement;

    private newFrame: ImageData;
    private oldFrame: ImageData;

    private noise: number = 0;

    private selectionColor: number = 0;

    private reverseCounter: number = 50;

    private motionCaptured: boolean = false;
    private motionCount: number = 0;

    private selectionRect: ScreenPoint;

    constructor() {

        Rx.Observable.fromEvent(document, "DOMContentLoaded")
            .subscribe(() => {

                this.selectionCanvas = document.querySelector("#selection") as HTMLCanvasElement;
                this.startButton = document.querySelector("#startButton") as HTMLButtonElement;
                this.outputText = document.querySelector("#textOutput") as HTMLParagraphElement;
                this.digit = document.querySelector("#digit") as HTMLHeadingElement;
                this.camera = document.querySelector("#my_camera") as HTMLDivElement;

                this.initApp()
                    .subscribe(() => {

                        Rx.Observable.fromEvent(this.startButton, "click")
                            .take(1)
                            .subscribe(() => {
                                Rx.Observable
                                    .interval(this.FRAME_RATE)
                                    .takeWhile(()=>!!this.reverseCounter)
                                    .subscribe(() => {
                                        this.reverseCounter--;
                                        this.digit.textContent = Math.round((this.reverseCounter/5)).toString();
                                        this.onSnapshot();
                                    }, null, () => {
                                        Rx.Observable.fromEvent(this.selectionCanvas, "click")
                                            .take(1)
                                            .subscribe((e: any) => {
                                                this.selectionRect = this.newSelection(e);
                                            }, null, () => {
                                                Rx.Observable
                                                    .interval(this.FRAME_RATE)
                                                    .take(50)
                                                    .subscribe(() => this.collectNoise(),
                                                    null, () => this.onNoiseCollected());
                                            });
                                    });
                            });
                        
                    });
            })

    }

    private initApp(): Rx.Observable<any>
    {
        Webcam.set({
            width: 640,
            height: 480,
            image_format: 'jpeg',
            jpeg_quality: 90
        });
        Webcam.attach('#my_camera');

        this.canvas = document.querySelector("#captured") as HTMLCanvasElement;

        return Rx.Observable.create((o) => {
            Webcam.on("load", (e: any) => o.onNext(e));
        });

    }

    private onSnapshot(): void
    {

        Rx.Observable.create((o) => {
            Webcam.snap((d: any, c: any, ctx: any) => o.onNext(ctx), this.canvas);
        }).take(1)
            .subscribe(() => {
            console.log("onSnapshot");
        });
    }

    private collectNoise(): void
    {
        this.outputText.textContent = "Определение шума";
        Rx.Observable.create((o) => {
            Webcam.snap((d: any, c: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => o.onNext(ctx));
        }).take(1)
            .subscribe((ctx: CanvasRenderingContext2D) => {
            this.oldFrame = this.newFrame;
            this.newFrame = ctx.getImageData(this.selectionRect.x,
                this.selectionRect.y,
                this.SELECTION_SIDE,
                this.SELECTION_SIDE);

            if (this.oldFrame)
            {
                var newCost = this.costFunction(this.oldFrame.data, this.newFrame.data);
                this.noise = newCost > this.noise ? newCost : this.noise;
                this.digit.textContent = this.noise.toString();
            }
        });
    }

    private onNoiseCollected(): void
    {
        this.outputText.textContent = "Определение шума завершено";

        this.drawSelectionRect(this.selectionCanvas.getContext("2d"),
            this.selectionRect.x, this.selectionRect.y, "#00ff00");

        Rx.Observable.fromEvent(this.startButton, "click")
            .take(1)
            .subscribe(() => {

                this.canvas.hidden = true;
                this.selectionCanvas.hidden = true;

                Rx.Observable.interval(this.FRAME_RATE)
                    .subscribe(() => this.motionDetection());
                
            });

    }

    private motionDetection(): void
    {
        Rx.Observable.create((o) => {
            Webcam.snap((d: any, c: any, ctx: any) => o.onNext(ctx), this.canvas);
        })
            .take(1)
            .subscribe((ctx: CanvasRenderingContext2D) => {
            this.oldFrame = this.newFrame;
            this.newFrame = ctx.getImageData(this.selectionRect.x,
                this.selectionRect.y,
                this.SELECTION_SIDE,
                this.SELECTION_SIDE);

            if (this.oldFrame) {
                var newCost: number = this.costFunction(this.oldFrame.data, this.newFrame.data);
                var isMotion: boolean = newCost > this.noise * this.TRESHOLD_COEFFICIENT;

                this.motionCount += (!this.motionCaptured && isMotion) ? 1 : 0;

                this.motionCaptured = isMotion;

                this.digit.textContent = this.motionCount.toString();
                this.outputText.textContent = isMotion ? "Есть движение" : "Нет движения";
            }

        });
    }

    private newSelection(e: MouseEvent): ScreenPoint
    {

        var pos: ScreenPoint = this.getMousePos(this.selectionCanvas, e);

        var ctx: CanvasRenderingContext2D = this.selectionCanvas.getContext("2d");

        var newX: number = pos.x - this.SELECTION_SIDE / 2;
        var newY: number = pos.y - this.SELECTION_SIDE / 2;

        this.drawSelectionRect(ctx, newX, newY);
        return new ScreenPoint(newX, newY);


    }

    private drawSelectionRect(ctx: CanvasRenderingContext2D, x: number, y: number, color?: string): void
    {
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = color ? color : "#ff0000";
        ctx.rect(x,y,
            this.SELECTION_SIDE,
            this.SELECTION_SIDE);
        ctx.stroke();
    }

    private costFunction(oldImage: Uint8ClampedArray, newImage: Uint8ClampedArray): number
    {
        var result: number = 0;

        if (oldImage.length != newImage.length)
            return Number.MAX_SAFE_INTEGER;

        for (var i: number = 0; i < oldImage.length; i+=4)
        {
            result += Math.abs(oldImage[i] - newImage[i]);
            result += Math.abs(oldImage[i + 1] - newImage[i + 1]);
            result += Math.abs(oldImage[i + 2] - newImage[i + 2]);
        }

        return Math.round(result / oldImage.length);
    }

    private getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): ScreenPoint
    {
        var rect = canvas.getBoundingClientRect();
        return new ScreenPoint(evt.clientX - rect.left,
            evt.clientY - rect.top);
        
    }

}

var app = new WebCamTargetApp();