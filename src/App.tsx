import React, {PureComponent, Component, CSSProperties} from "react";
import debounce from "lodash.debounce";

interface State {
    data: string;
    generation: number;

    reactMarkup: string;
    imgs: Array<{filename: string; value: string}>;
    paths: Array<{name: string; value: string}>;
    imgNames: Array<string>;
    pathNames: Array<string>;
}

const scratchSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
);
scratchSvg.setAttribute(
    "style",
    "position: absolute; top:0; left:0;pointer-events: none; width: 1px; height: 1px; opacity: 0",
);
document.body.appendChild(scratchSvg);

const scratchPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
);
scratchSvg.appendChild(scratchPath);

class Path extends PureComponent<{d: string}> {
    render() {
        scratchPath.setAttribute("d", this.props.d);
        const bbox = scratchPath.getBBox();

        return (
            <div style={styles.imgWrapper}>
                <svg
                    viewBox={`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`}
                    style={styles.img}
                >
                    <path
                        style={{fill: "none", stroke: "rebeccapurple"}}
                        d={this.props.d}
                    />
                </svg>
            </div>
        );
    }
}

class App extends Component<{}, State> {
    state: State = {
        data: "",
        generation: 0,
        reactMarkup: "",
        imgs: [],
        paths: [],
        imgNames: [],
        pathNames: [],
    };

    render() {
        const {reactMarkup, paths, imgs, generation} = this.state;

        return (
            <div style={styles.page}>
                <h1>Figma SVG to React SVG</h1>
                <textarea
                    autoFocus
                    value=""
                    onChange={this._handleChange}
                    onPaste={this._handlePaste}
                    style={styles.input}
                    placeholder="In Figma, right click and select 'Copy as SVG'. Paste the result here."
                />
                <div style={styles.output} key={generation}>
                    <h2>Paths</h2>
                    {!paths.length ? (
                        <i>No paths over 20 characters</i>
                    ) : (
                        <i>
                            You can rename path to make the output easier to
                            manipulate in code. These changes will be reflected
                            in the markup.
                            <br />
                            <br />
                        </i>
                    )}
                    {paths.length > 0 && (
                        <div style={styles.images}>
                            {paths.map((path, i) => (
                                <span key={i} style={styles.imgBox}>
                                    <Path d={path.value} />
                                    <input
                                        defaultValue={path.name}
                                        onChange={ev => {
                                            this._changePath(
                                                i,
                                                ev.target.value,
                                            );
                                        }}
                                    />
                                </span>
                            ))}
                        </div>
                    )}

                    <h2>Images</h2>
                    {!imgs.length ? (
                        <i>No images</i>
                    ) : (
                        <i>
                            You can rename images. These changes will be
                            reflected in the markup, and in the default name of
                            the image when you download it. Click on an image to
                            download it.
                            <br />
                            <br />
                        </i>
                    )}
                    {imgs.length > 0 && (
                        <div style={styles.images}>
                            {imgs.map((img, i) => (
                                <span key={i} style={styles.imgBox}>
                                    <a
                                        href="javascript:void(0)"
                                        onClick={() => {
                                            function dataURIToBlob(
                                                dataURI: string,
                                            ) {
                                                var binStr = atob(
                                                        dataURI.split(",")[1],
                                                    ),
                                                    len = binStr.length,
                                                    arr = new Uint8Array(len),
                                                    mimeString = dataURI
                                                        .split(",")[0]
                                                        .split(":")[1]
                                                        .split(";")[0];

                                                for (var i = 0; i < len; i++) {
                                                    arr[i] = binStr.charCodeAt(
                                                        i,
                                                    );
                                                }

                                                return new Blob([arr], {
                                                    type: mimeString,
                                                });
                                            }

                                            const link = document.createElement(
                                                "a",
                                            );
                                            document.body.appendChild(link);
                                            link.download = img.filename;
                                            link.href = URL.createObjectURL(
                                                dataURIToBlob(img.value),
                                            );
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                    >
                                        <div style={styles.imgWrapper}>
                                            <img
                                                style={styles.img}
                                                src={img.value}
                                            />
                                        </div>
                                    </a>
                                    <input
                                        defaultValue={img.filename}
                                        onChange={ev => {
                                            this._changeImg(i, ev.target.value);
                                        }}
                                    />
                                </span>
                            ))}
                        </div>
                    )}

                    <h2>Markup</h2>
                    <textarea
                        value={reactMarkup}
                        style={styles.codeOutput}
                        readOnly
                        placeholder="React markup with show up here."
                    />
                </div>
            </div>
        );
    }

    _pendingPathNames: Array<string> | null = null;
    _pendingImgNames: Array<string> | null = null;

    _sync = debounce(() => {
        if (this._pendingPathNames) {
            this.setState({
                pathNames: this._pendingPathNames,
            });
        }

        if (this._pendingImgNames) {
            this.setState({
                imgNames: this._pendingImgNames,
            });
        }

        this._pendingPathNames = null;
        this._pendingImgNames = null;
    }, 500);

    _changePath = (i: number, val: string) => {
        const pathNames = this._pendingPathNames || this.state.pathNames;
        this._pendingPathNames = [...pathNames];
        this._pendingPathNames[i] = val;
        this._sync();
    };

    _changeImg = debounce((i: number, val: string) => {
        const imgNames = this._pendingImgNames || this.state.imgNames;
        this._pendingImgNames = [...imgNames];
        this._pendingImgNames[i] = val;
        this._sync();
    }, 500);

    _handleChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        this._handleData(ev.target.value);
        ev.preventDefault();
    };
    _handlePaste = (ev: React.ClipboardEvent<HTMLTextAreaElement>) => {
        this._handleData(ev.clipboardData.getData("text"));
        ev.preventDefault();
    };
    _handleData = (data: string) => {
        this.setState({data, generation: this.state.generation + 1});
    };

    static getDerivedStateFromProps(props: {}, state: State): Partial<State> {
        const {data, pathNames, imgNames} = state;
        if (!data) {
            return {
                reactMarkup: "",
                imgs: [],
                paths: [],
            };
        }

        function nodeToString(
            el: Element,
            imgsOut: Array<{filename: string; value: string}>,
            pathsOut: Array<{name: string; value: string}>,
        ): string {
            let attributes: {[key: string]: string} = {};
            let attributeNames = el.getAttributeNames();
            for (let i = 0; i < attributeNames.length; ++i) {
                let reactName = attributeNames[i].replace(/[-:]([a-z])/g, g =>
                    g[1].toUpperCase(),
                );
                let value = el.getAttribute(attributeNames[i]);

                if (
                    reactName === "xlinkHref" &&
                    value &&
                    value.startsWith("data:")
                ) {
                    const maybeFiletype = value
                        .slice(0, 100)
                        .match(/^data:image\/([^;]+)/);
                    const filetype = maybeFiletype
                        ? `.${maybeFiletype[1]}`
                        : "";
                    const filename =
                        imgNames[imgsOut.length] ||
                        `image${imgsOut.length}${filetype}`;
                    attributes[reactName] = `"${filename}"`;
                    attributes["href"] = `"${filename}"`;
                    imgsOut.push({
                        filename,
                        value,
                    });
                } else if (reactName === "style" && value) {
                    let style: {[key: string]: string} = {};
                    value.split(";").forEach(pair => {
                        const [k, v] = pair.split(":");
                        style[
                            k.replace(/-([a-z])/g, g => g[1].toUpperCase())
                        ] = v;
                    });
                    attributes[reactName] = `{{${Object.keys(style)
                        .sort()
                        .map(key => `${key}: "${style[key]}"`)}}}`;
                } else if (reactName === "d" && value && value.length > 20) {
                    const pathname =
                        pathNames[pathsOut.length] || `PATH_${pathsOut.length}`;
                    pathsOut.push({name: pathname, value});
                    attributes[reactName] = `{${pathname}}`;
                } else if (reactName === "maskType") {
                    attributes["mask-type"] = `"${value}"`;
                } else if (value) {
                    attributes[reactName] = `"${value}"`;
                }
            }

            let children = "";

            for (let i = 0; i < el.children.length; ++i) {
                children += nodeToString(el.children[i], imgsOut, pathsOut);
            }

            return `<${[
                el.tagName,
                ...Object.keys(attributes)
                    .sort()
                    .map(a => `${a}=${attributes[a]}`),
            ].join(" ")}>${children}</${el.tagName}>`;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, "text/xml");
            const root = doc.children[0];
            const imgs: Array<{filename: string; value: string}> = [];
            const paths: Array<{name: string; value: string}> = [];
            let reactMarkup = nodeToString(root, imgs, paths);

            if (paths.length) {
                let markupLines = paths.map(
                    path => `const ${path.name} = "${path.value}";`,
                );

                reactMarkup =
                    markupLines.join("\n") + "\n\n// ...\n\n" + reactMarkup;
            }

            return {
                reactMarkup,
                imgs,
                paths,
            };
        } catch (err) {
            return {
                reactMarkup: "Could not generate markup.",
                imgs: [],
                paths: [],
            };
        }
    }
}

const code: CSSProperties = {
    fontSize: 14,
    fontFamily:
        "Courier New, Courier, Lucida Sans Typewriter, Lucida Typewriter, monospace",
};

const styles = {
    page: {
        position: "absolute",
        left: 0,
        top: 0,
        minHeight: "calc(100vh - 24px)",
        right: 0,
        display: "flex",
        padding: 12,
        flexDirection: "column",
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    } as CSSProperties,
    columns: {
        display: "flex",
        flex: 1,
    } as CSSProperties,
    input: {
        fontSize: 16,
        padding: 12,
        height: 20,
        minHeight: 20,
        resize: "none",
        overflow: "hidden",
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    } as CSSProperties,
    output: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        resize: "none",
    } as CSSProperties,
    codeOutput: {
        ...code,
        flex: 1,
        minHeight: 300,
        marginBottom: 16,
    } as CSSProperties,
    images: {
        display: "flex",
        flexWrap: "wrap",
    } as CSSProperties,
    imgBox: {
        display: "flex",
        flexDirection: "column",
    } as CSSProperties,
    imgWrapper: {
        width: 200,
        height: 200,
        border: "1px solid rebeccapurple",
    },
    img: {
        display: "block",
        width: "auto",
        height: "auto",
        maxWidth: 200,
        maxHeight: 200,
        marginRight: 16,
    } as CSSProperties,
};

export default App;
