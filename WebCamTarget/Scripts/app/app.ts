declare var Webcam: any;


class WebCamTargetApp {

    private FRAME_RATE: number = 200;

    private canvas: HTMLCanvasElement;

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
        });
    }


}

var app = new WebCamTargetApp();