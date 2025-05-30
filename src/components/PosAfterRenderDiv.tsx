import React, { Component } from "react";

type PosAfterRenderDivProps = {
    className?: string;
    style?: React.CSSProperties;
    onClick?: React.MouseEventHandler<HTMLDivElement> | undefined;
    children?: React.ReactNode;
    divRef?: React.RefObject<PosAfterRenderDivRef> | undefined;
    onDimensionsCalculated?: (
        width: number,
        height: number
    ) => [number, number];
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
};

type PosAfterRenderDivRef = HTMLDivElement;

class PosAfterRenderDiv extends Component<PosAfterRenderDivProps> {
    private internalRef: React.RefObject<HTMLDivElement | null>;

    constructor(props: PosAfterRenderDivProps) {
        super(props);
        this.internalRef = React.createRef(); // Create an internal ref
    }

    get currentRef() {
        return this.props.divRef || this.internalRef; // Use external ref if provided, otherwise fallback
    }

    componentDidMount() {
        if (this.currentRef?.current && this.props.onDimensionsCalculated) {
            const { offsetWidth, offsetHeight } = this.currentRef.current;
            const pos = this.props.onDimensionsCalculated(
                offsetWidth,
                offsetHeight
            );
            this.currentRef.current.style.left = pos[0] + "px";
            this.currentRef.current.style.top = pos[1] + "px";
        }
    }

    // prevProps: Readonly<PosAfterRenderDivProps>,
    // prevState: Readonly<{}>,
    // snapshot?: any
    componentDidUpdate(): void {
        if (this.currentRef?.current && this.props.onDimensionsCalculated) {
            const { offsetWidth, offsetHeight } = this.currentRef.current;
            const pos = this.props.onDimensionsCalculated(
                offsetWidth,
                offsetHeight
            );
            this.currentRef.current.style.left = pos[0] + "px";
            this.currentRef.current.style.top = pos[1] + "px";
        }
    }

    render() {
        const {
            className,
            style,
            children,
            onClick,
            onMouseEnter,
            onMouseLeave,
        } = this.props;

        return (
            <div
                ref={this.currentRef}
                onClick={onClick}
                className={className}
                style={style}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {children}
            </div>
        );
    }
}

const PosAfterRenderDivWrapper = (props: PosAfterRenderDivProps) => {
    return <PosAfterRenderDiv {...props} />;
};

export default PosAfterRenderDivWrapper;
