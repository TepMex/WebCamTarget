declare var Webcam: any;


class WebCamTargetApp {

    private FRAME_RATE: number = 200;

    private canvas: HTMLCanvasElement;

    private newFrame: ImageData;
    private oldFrame: ImageData;

    constructor() {

        Rx.Observable.fromEvent(document, "DOMContentLoaded")
            .subscribe(() => {
                this.initApp()
                    .subscribe(() => {
                        Rx.Observable
                            .interval(this.FRAME_RATE)
                            .subscribe(() => {
                                this.onSnapshot();
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

    private onSnapshot(): void {

        Rx.Observable.create((o) => {
            Webcam.snap((d: any, c: any, ctx: any) => o.onNext(c), this.canvas);
        }).subscribe(() => {

            var ctx: CanvasRenderingContext2D = this.canvas.getContext("2d");
            this.oldFrame = this.newFrame;
            this.newFrame = ctx.getImageData(608, 0, 640, 32);

            if (this.oldFrame)
                document.querySelector("#digit")
                    .textContent = this.costFunction(this.oldFrame.data, this.newFrame.data).toString();

        });
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

}

var app = new WebCamTargetApp();