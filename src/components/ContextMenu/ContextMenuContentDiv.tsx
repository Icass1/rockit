import React, { Component } from "react";

type ContextMenuContentDivProps = {
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    children?: React.ReactNode;
    divRef: React.RefObject<ContextMenuContentDivRef> | undefined;
    onDimensionsCalculated?: (
        width: number,
        height: number
    ) => [number, number];
};

type ContextMenuContentDivRef = HTMLDivElement;

class ContextMenuContentDiv extends Component<ContextMenuContentDivProps> {
    divRef: React.RefObject<HTMLDivElement> | undefined;

    componentDidMount() {
        if (this.divRef?.current && this.props.onDimensionsCalculated) {
            const { offsetWidth, offsetHeight } = this.divRef.current;
            const pos = this.props.onDimensionsCalculated(
                offsetWidth,
                offsetHeight
            );
            this.divRef.current.style.left = pos[0] + "px";
            this.divRef.current.style.top = pos[1] + "px";
        }
    }

    // prevProps: Readonly<ContextMenuContentDivProps>,
    // prevState: Readonly<{}>,
    // snapshot?: any
    componentDidUpdate(): void {
        if (this.divRef?.current && this.props.onDimensionsCalculated) {
            const { offsetWidth, offsetHeight } = this.divRef.current;
            const pos = this.props.onDimensionsCalculated(
                offsetWidth,
                offsetHeight
            );
            this.divRef.current.style.left = pos[0] + "px";
            this.divRef.current.style.top = pos[1] + "px";
        }
    }

    render() {
        const { className, style, children, onClick, divRef } = this.props;
        if (divRef) {
            this.divRef = divRef;
        }

        return (
            <div
                id="ContextMenuContentDiv"
                ref={this.divRef}
                onClick={onClick}
                className={className}
                style={style}
            >
                {children}
            </div>
        );
    }
}

export default React.forwardRef<
    ContextMenuContentDivRef,
    ContextMenuContentDivProps
>((props, ref) => <ContextMenuContentDiv {...props} />);
