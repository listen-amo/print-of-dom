import { eachTree } from "./utils.js";
/**
 * @class PrintOfDom
 */
export default class PrintOfDom {
  static regExcludeAttr =
    /^(transition|scroll|overscroll|cursor|animation|inline-size|pointer-events)/;
  static CLASSNAME_IFRAME = "print-of-dom__iframe";
  constructor() {
    this.print = this._print.bind(this);
  }
  /**
   * 打印方法
   * @param {HTMLElement|String} el - 需要被打印DOM元素 或 选择器字符串
   * @param {Object|printCallback} [options] - 打印配置或者打印回调函数
   * @param {printCallback} [options.handler] - 打印回调函数
   * @param {Boolean} [options.wrap=false] - 是否需要同时克隆父元素
   * @param {RegExp} [options.regExcludeAttr=/^(transition|scroll|overscroll|cursor|animation|inline-size|pointer-events)/] - 转换为行内样式前需要排除的样式正则
   * @param {Boolean} [options.debug=false] - 是否开启 debug 模式
   * 如果开启debug模式，则会保留并且显示用于打印而创建的iframe标签
   * 这个iframe是被添加在body的最后
   * 这个iframe标签有一个固定的类名 "print-of-dom__iframe"
   * @returns {Promise} - 打印状态。resolve时表示打印结束，但只能表示打印页面成功的调起并且关闭，并不能确定打印是否成功。
   */
  _print(el, options) {
    // 0. options初始化
    this.initOptions(options);
    const { debug: isDebug } = this.options;

    // 1. 初始相关DOM获取
    try {
      el = this.getDom(el);
      this.setOwnerDocument(el);
    } catch (error) {
      Promise.reject(error);
      return;
    }
    // html 和 document都被视为body进行打印
    if (
      el === this.ownerDocument.documentElement ||
      el === this.ownerDocument
    ) {
      el = this.ownerDocument.body;
    }

    // 2. 目标DOM样式，结构相关处理
    let dom = this.cloneDom(el, (originalNode, clonedNode) => {
      // canvas转换为图片
      if (originalNode.tagName === "CANVAS") {
        clonedNode = this.canvasToImage(originalNode);
      }
      return this.handler(originalNode, clonedNode, {
        cssText: this.getDomComputedCssText(originalNode),
      });
    });
    dom = this.wrapDoms(el, dom);

    // 3. iframe创建，目标DOM添加，样式相关标签复制
    let dIframe = this.createIframe(dom);
    this.copyStyleEls(dIframe);

    // 4. 资源加载完成后开始打印
    const printAfter = this.iframeLoaded(dIframe).then(() => {
      dIframe.contentWindow.print(); // 调用打印的时候会阻塞
      !isDebug && dIframe.remove(); // 移除iframe
    });

    // debug 设置
    if (isDebug) {
      if (this.$debugDIframe) {
        this.$debugDIframe.remove();
      }
      this.$debugDIframe = dIframe;
    }

    return printAfter;
  }
  initOptions(options) {
    if (typeof options === "function") {
      options = { handler: options };
    }
    this.options = {
      wrap: false,
      regExcludeAttr: null,
      handler: null,
      debug: false,
      ...options,
    };
    if (this.options.regExcludeAttr) {
      PrintOfDom.regExcludeAttr = this.options.regExcludeAttr;
    }
  }
  getDom(el) {
    if (typeof el === "string") {
      el = document.querySelector(el);
    }
    if (!el) {
      throw "target DOM not find.";
    }
    return el;
  }
  setOwnerDocument(el) {
    if (!el.ownerDocument) {
      throw "The ownerDocument of the target DOM cannot be null.";
    }
    this.ownerDocument = el.ownerDocument;
  }
  cloneDom(dom, handler) {
    const elCache = [];
    let newDom;
    // 复制DOM树
    eachTree(
      [dom],
      (originalNode, { parent }) => {
        if (
          originalNode.nodeType === Node.COMMENT_NODE ||
          originalNode.tagName === "SCRIPT"
        ) {
          return;
        }

        const clonedNode = (originalNode.PRINT_OF_DOM_CLONEDOM = handler(
          originalNode,
          originalNode.cloneNode(false)
        ));
        if (!parent.$root) {
          parent.PRINT_OF_DOM_CLONEDOM.appendChild(clonedNode);
        }
        elCache.push(originalNode);
      },
      "childNodes"
    );
    // 获取复制的DOM树的根节点
    newDom = dom.PRINT_OF_DOM_CLONEDOM;
    // 删除复制时产生的缓存数据，处理内存泄漏
    elCache.forEach((el) => {
      delete el.PRINT_OF_DOM_CLONEDOM;
    });
    return newDom;
  }
  getDomComputedCssText(dom) {
    let cssText = "";
    if (dom.nodeType === Node.ELEMENT_NODE) {
      // 把所有样式转换为行内样式
      const styles = getComputedStyle(dom);
      let len = styles.length;
      while (len--) {
        const k = styles.item(len);
        let v;
        if (this.testExcludeAttr(k)) {
          v = styles.getPropertyValue(k);
          cssText += k + ":" + v + ";";
        }
      }
    }
    return cssText;
  }
  wrapDoms(orginalDom, targetDom) {
    if (this.options.wrap) {
      const { body, documentElement } = this.ownerDocument;
      let current = orginalDom.parentNode,
        child,
        clonedNode,
        wrapDom;
      while (current && current !== body && current !== documentElement) {
        clonedNode = this.handler(current, current.cloneNode(false), {
          cssText: "position: static;",
          className: current.className + " print-of-dom__wrap",
        });
        if (clonedNode.nodeType === Node.ELEMENT_NODE) {
          if (child) {
            clonedNode.appendChild(child);
          } else {
            wrapDom = clonedNode;
          }
          child = clonedNode;
        }
        current = current.parentNode;
      }
      // 包裹后返回新的根节点
      if (clonedNode) {
        wrapDom.appendChild(targetDom);
        return clonedNode;
      }
    }
    // 返回源节点
    return targetDom;
  }
  createIframe(child) {
    const { ownerDocument } = this;
    const dIframe = ownerDocument.createElement("iframe");
    dIframe.className = PrintOfDom.CLASSNAME_IFRAME;
    dIframe.style.cssText = this.options.debug
      ? ""
      : "position: absolute; z-index: -1; left: -9999px; top: -9999px;";
    dIframe.width = ownerDocument.documentElement.clientWidth;
    dIframe.height = ownerDocument.documentElement.clientHeight;
    ownerDocument.body.appendChild(dIframe);
    // 添加body和html的类名以及行内样式
    this.handler(
      ownerDocument.documentElement,
      dIframe.contentDocument.documentElement
    );
    this.handler(ownerDocument.body, dIframe.contentDocument.body);
    // body只添加其子节点
    if (child.nodeName === "BODY") {
      const childNodes = Array.from(child.childNodes);
      for (const n of childNodes) {
        dIframe.contentDocument.body.appendChild(n);
      }
    } else {
      dIframe.contentDocument.body.appendChild(child);
    }
    return dIframe;
  }
  testExcludeAttr(attr) {
    return !PrintOfDom.regExcludeAttr.test(attr);
  }
  handler(originalNode, clonedNode, args) {
    const { handler } = this.options;
    let rv;
    args = args || {
      cssText: originalNode.style.cssText,
      className: originalNode.className,
    };
    if (handler) {
      rv = handler(originalNode, clonedNode, args) || args;
      if (rv instanceof Node) {
        clonedNode = rv;
      } else {
        args = rv;
      }
    }
    if (clonedNode.nodeType === Node.ELEMENT_NODE) {
      if (args.cssText) {
        clonedNode.style.cssText = args.cssText;
      }
      if (args.className) {
        clonedNode.className = args.className;
      }
    }
    return clonedNode;
  }
  copyStyleEls(dIframe) {
    const styles = this.ownerDocument.styleSheets;
    let len = styles.length;
    while (len--) {
      dIframe.contentDocument.head.appendChild(
        styles.item(len).ownerNode.cloneNode(true)
      );
    }
  }
  iframeLoaded(dIframe) {
    const imageLoaded = Promise.all(
      Array.from(dIframe.contentDocument.images).map(
        (img) =>
          new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
      )
    );
    const styleLoaded = Promise.all(
      Array.from(dIframe.contentDocument.querySelectorAll("link, style")).map(
        (elLink) =>
          new Promise((resolve) => {
            elLink.onload = resolve;
            elLink.onerror = resolve;
          })
      )
    );
    const fontsLoaded = dIframe.contentDocument.fonts.ready;
    return Promise.all([imageLoaded, styleLoaded, fontsLoaded]).then(
      (result) => new Promise((resolve) => setTimeout(resolve, 100, result))
    );
  }
  canvasToImage(canvas) {
    let img = new Image();
    img.src = canvas.toDataURL("image/png", 1);
    return img;
  }
}

/**
 * 打印之前，对所有DOM进行克隆处理时的回调函数
 * @callback printCallback
 * @param {Node} originalNode - 原始节点
 * @param {Node} clonedNode - 原始节点的替代节点。大多情况下是原始节点的克隆节点
 * @param {Object} [args] - 替代节点可能会改变和设置的主要参数
 * @param {String} [args.cssText] - 将会被设置给替代节点的 style.cssText(行内样式) 值
 * @param {String} [args.className] - 将会被设置给替代节点的 className
 * @return {Node|Object|undefind} - 返回值将直接影响替代节点。
 *  - Node 替换默认的替代节点
 *  - Object 替换默认的 args 参数
 *  - undefind 不进行任何替换操作。但是可以直接修改args的参数
 */
