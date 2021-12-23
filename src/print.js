import { eachTree } from "./utils.js";
// 打印dom
// TODO canvas处理
export class PrintOfDom {
  static regExcludeAttr =
    /^(-webkit-|transition|stroke|scroll|overscroll|cursor|animation|inline-size|pointer-events)/;
  static CLASSNAME_IFRAME = "print-of-dom__iframe";
  constructor() {
    this.print = this._print.bind(this);
  }
  _print(el, options) {

    // 1. 初始相关DOM以及options
    el = this.getDom(el);
    this.setOwnerDocument(el);
    this.initOptions(options);

    // 2. 目标DOM样式，结构相关处理
    const { debug: isDebug } = this.options;
    let dom = this.getMainDom(el);
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
      throw "The ownerDocument of the target DOM cannot be null";
    }
    this.ownerDocument = el.ownerDocument;
  }
  getMainDom(dom) {
    const elCache = [];
    eachTree([dom], (el) => {
      // 记录初始行内样式以及修改过行内样式的元素
      if (el.style.cssText) {
        el._PRINT_DOM_ORIGIN_CSSTEXT = el.style.cssText;
      }
      elCache.push(el);
      // 把所有样式转换为行内样式
      const styles = getComputedStyle(el);
      let i = styles.length,
        cssText = "";
      while (i--) {
        const k = styles.item(i);
        let v;
        if (this.testExcludeAttr(k)) {
          v = styles.getPropertyValue(k);
          cssText += k + ":" + v + ";";
        }
      }
      this.handler(el, el, {
        cssText,
      });
    });
    // 克隆转换后的元素
    dom = dom.cloneNode(true);
    // 恢复原本的行内样式
    elCache.forEach((el) => {
      if (el._PRINT_DOM_ORIGIN_CSSTEXT) {
        el.style.cssText = el._PRINT_DOM_ORIGIN_CSSTEXT;
        delete el._PRINT_DOM_ORIGIN_CSSTEXT;
      } else {
        el.removeAttribute("style");
      }
    });
    return dom;
  }
  wrapDoms(orginalDom, targetDom) {
    if (this.options.wrap) {
      const { body, documentElement } = this.ownerDocument;
      let current = orginalDom.parentNode,
        child,
        newNode,
        wrapDom;
      while (current && current !== body && current !== documentElement) {
        newNode = current.cloneNode(false);
        this.handler(current, newNode, {
          cssText: "position: static;",
          className: "print-of-dom__wrap",
        });
        if (child) {
          newNode.appendChild(child);
        } else {
          wrapDom = newNode;
        }
        child = newNode;
        current = current.parentNode;
      }
      if (newNode) {
        wrapDom.appendChild(targetDom);
        return newNode;
      }
    }
    return targetDom;
  }
  createIframe(child) {
    const { ownerDocument } = this;
    const dIframe = ownerDocument.createElement("iframe");
    dIframe.className = PrintOfDom.CLASSNAME_IFRAME
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
    dIframe.contentDocument.body.appendChild(child);
    return dIframe;
  }
  testExcludeAttr(attr) {
    return ![PrintOfDom.regExcludeAttr, this.options.regExcludeAttr]
      .filter((reg) => reg)
      .some((reg) => reg.test(attr));
  }
  handler(orginalDom, targetDom, args) {
    const { handler } = this.options;
    args = args || {
      cssText: orginalDom.style.cssText,
      className: orginalDom.className,
    };
    if (handler) {
      args = handler(orginalDom, args) || args;
    }
    if (args.cssText) {
      targetDom.style.cssText = args.cssText;
    }
    if (args.className) {
      targetDom.className = args.className;
    }
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
}
const pod = new PrintOfDom();
export default pod.print;

// 将dom的部分样式转换为行内样式
// function transformOfInlineStyle(dom) {
//   const includeStyle = ["height"];
//   const elCache = [];
//   eachTree([dom], (el) => {
//     // 记录初始行内样式以及修改过行内样式的元素
//     if (el.style.cssText) {
//       el._PRINT_DOM_ORIGIN_CSSTEXT = el.style.cssText;
//     }
//     elCache.push(el);
//     // 把样式转换为行内样式
//     const styles = getComputedStyle(el);
//     let cssText = el.style.cssText;
//     includeStyle.forEach(function (attr) {
//       let v = styles[attr];
//       cssText += attr + ":" + v + ";";
//     });
//     el.style.cssText = cssText;
//   });
//   // 克隆转换后的元素
//   dom = dom.cloneNode(true);
//   // 恢复原本的行内样式
//   elCache.forEach((el) => {
//     if (el._PRINT_DOM_ORIGIN_CSSTEXT) {
//       el.style.cssText = el._PRINT_DOM_ORIGIN_CSSTEXT;
//       delete el._PRINT_DOM_ORIGIN_CSSTEXT;
//     } else {
//       el.removeAttribute("style");
//     }
//   });
//   return dom;
// }
