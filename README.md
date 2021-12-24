## 说明

可以单独的对一个DOM进行打印。

采用复制DOM到一个新的iframe中的方式，对字体图标，图片，canvas等都进行了相应的处理

并且可以方便的自己处理每一个元素

## 安装引用

### 安装

```cmd
$ npm install --save print-of-dom
```

### 引用

- **ES**

  ```js
  import printOfDom from "print-of-dom";
  ```

- **commonjs**

  ```js
  const printOfDom = require("print-of-dom");

- **全局导入** 

  ```js
  // ES
  import "print-of-dom/dist/print-of-dom.js";
  
  window.printOfDom("body"); // 将会在window上注册一个printOfDom方法
  ```

## 基本使用

```js
import printOfDom from "print-of-dom";

printOfDom("body", { debug: true }).then(()=> {
    console.log("打印结束");
});
```

## 参数说明

**printOfDom(domOrSelector \[, options\] \[, printCallback\])**

> 注意：打印方法将会返回一个promies来表示打印是否结束。但是只能表示打印页面成功的调起并且关闭，并**不能确定打印是否成功**

*参数：*

- `@param {HTMLElement|String} domOrSelector` - 需要被打印DOM元素 或 选择器字符串
- `@param {Object|printCallback} [options]` - 打印配置或者打印回调函数
  - `@param {Function} [options.handler]` - 打印之前，对所有需要打印的DOM进行处理时回调函数
  - `@param {Boolean} [options.wrap=false]` - 是否需要将打印节点包含在父元素中
  - `@param {RegExp} [options.regExcludeAttr]` - 遍历 originalNode 时，获取原始节点的computedStyle转换为cssText之前需要排除的样式属性
  - `@param {Boolean} [options.debug=false]` - 是否开启 debug 模式

*返回值：*`@returns {Promise}` - 打印状态

- 表示打印页面成功的调起并且关闭
- 并不能确定打印是否成功



**options.handler(originalNode, clonedNode[, args])** 

打印之前，对所有需要打印的DOM进行处理时回调函数。可以在这里对即将打印的DOM进行**修改，替换，筛选**

- 这个方法会在这些时候调用：

  - 遍历 originalNode 时，每个节点克隆后
  - 创建iframe标签复制原始的html，body类名和样式时
  - 设置了wrap参数，查找到的每个父节点并克隆后

  也就是说，在iframe中所有影响打印结果的DOM都会经过这个方法

- 默认情况下会把canvas标签转换为img

- 当 options 直接设置为一个方法时是此参数的快捷方式

  ```js
  printOfDom("body", function(originalNode, clonedNode, args){});
  // 等同于
  printOfDom("body", {
      handler(originalNode, clonedNode, args){}
  });
  ```

*参数：*

- `@param {Node} originalNode` - 原始节点
- `@param {Node} clonedNode` - 克隆节点。原始节点的替代节点，大多情况下是原始节点的克隆，除了 body 和 html
- `@param {Object} [args]` - 设置给替代节点参数
  - `@param {String} [args.cssText]` - 将会被设置给替代节点的 style.cssText(行内样式) 值。
    - 遍历 originalNode 时，原始节点的 computedStyle
     	- body 和 html 等同原始节点的行内样式
     	- 设置了wrap参数，查找父节点时，为`position: static;`
  - `@param {String} [args.className]` - 将会被设置给替代节点的 className
    - 遍历 originalNode，body ，html为原始DOM的`originalNode.className`
    - 设置了wrap参数，查找父节点时，为 `originalNode.className + " print-of-dom__wrap"`

*返回值：*`@return {Node|Object|undefind}` - 返回值将直接影响替代节点

- `{Node}` 替换默认的替代节点
- `{Object}` 替换默认的 args 参数
- `false` 排除当前节点以及其所有的子节点。 不能排除 html 和 body
- `{undefind}` 不进行任何替换操作。但是可以直接修改args的参数

*示例：*

- 替换节点

  处理函数中返回一个新的节点可以代替默认的克隆节点 clonedNode 

  这个替换只是替换克隆节点本身，并不包括所有子节点，子节点依旧会正常添加为新节点的子节点

  ```js
  printOfDom("body", {
  	handler(originalNode, clonedNode, args){
          // 把所有的a标签替换为span标签
          if(originalNode.tagName === "A"){
              let span = document.createElement("span");
              span.className = args.className + " new_span";
          	return span; // return 新节点
          }
      }
  });
  ```

- 替换参数

  ```js
  printOfDom("body", {
  	handler(originalNode, clonedNode, args){
          if(originalNode.tagName === "A"){
              return {
                  cssText: args.cssText + "color: red;",
                  className: args.className + " link"
              }
          }
      }
  });
  ```

- 排除节点

  ```js
  printOfDom("body", {
  	handler(originalNode, clonedNode, args){
          // 返回 false 排除当前节点
          return !/no-print/.test(args.className);
      }
  });
  ```

- 修改参数

  ```js
  printOfDom("body", {
  	handler(originalNode, clonedNode, args){
          args.cssText += "color: red;";
          args.className += " link";
      }
  });
  ```



**options.wrap**

是否需要将打印节点包含在父元素中

> 主要是为了解决一些伪类元素的设置是依赖于父元素的类名设置的，比如通过类名设置字体图标时。



**options.regExcludeAttr**

遍历 originalNode 时，获取原始节点的`computedStyle`转换为cssText之前需要排除的样式属性

> 主要是排除一些完全不会影响打印结果，或者导致打印结果与预期不符的样式

- 默认值为 `/^(transition|scroll|overscroll|cursor|animation|inline-size|pointer-events)/`



**options.debug**

是否开启调试模式

- 开启后会保留并且显示用于打印而创建的iframe标签
- 这个iframe是被添加在body的最后
- 这个iframe标签有一个固定的类名 "print-of-dom__iframe"

