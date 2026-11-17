import "react"
declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            [e:string]: any;
        }
    }
}