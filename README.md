<div align="center">

![](./icons/icon.png)

## i18n Haru | A better i18n extension for  <code>Vscode</code>

中文教程 | [English Tutorial](https://www.pandanese.com/blog/chinese-learning-websites)


</div>

---

## Usage Examples

### Hover Tips and Inlay Hints

![](https://pic2.zhimg.com/v2-237209c8beaa3e596d33c063fc00d3e7_r.jpg)

### Autocomplete

![](https://pic1.zhimg.com/v2-45fbb658d6010b1d959778ca596ae972_r.jpg)

### Go to Definition

![](https://pic1.zhimg.com/v2-612537655266fc4b769c7129cf173f02_r.jpg)

### Diagnostics

![](https://pica.zhimg.com/v2-258d1d5080256e7f818cb108461070de_r.jpg)

### Quick Fixes

![](https://picx.zhimg.com/v2-b27637a4b41fae90e236fd85a6899e39_r.jpg)

### Quick Creation of i18n Token

By selecting text in the editor, you can quickly create a new i18n token item (shortcut: alt i).

![](https://raw.githubusercontent.com/LSTM-Kirigaya/i18n-Haru/refs/heads/main/images/i18n-add.gif)

### Quick Deletion of i18n Token

In a JSON file, you can click the i18n delete button in the top right corner to delete a specific token across all i18n files simultaneously.

![](https://pic4.zhimg.com/v2-3b172ec3cdfbbe2c211fabcfa837dc07_r.jpg)

---

## Configuration

![](https://pic1.zhimg.com/80/v2-6a332b787431a4c1f621ad672f9aa377_1440w.png)

The core configuration requires setting up two functions (in `.vscode/setting.json`):

`i18n-haru-root`: The path to the i18n root directory (relative or absolute). i18n-haru will scan all JSON/YAML files in this folder and, after removing the suffix and the longest prefix, match the remaining string with each ISO639 code.

`i18n-haru-main`: The base language for the i18n system, defaulting to zh-cn. Most features, such as the autocomplete list, are generated based on the i18n items of the base language. Compared to the base language, parts missing in other i18n files will trigger an error warning, and redundant parts will be omitted.

---

## 使用示例

### 悬停提示 和 inlay hints

![](https://pic2.zhimg.com/v2-237209c8beaa3e596d33c063fc00d3e7_r.jpg)

### 自动补全

![](https://pic1.zhimg.com/v2-45fbb658d6010b1d959778ca596ae972_r.jpg)

### 定义跳转

![](https://pic1.zhimg.com/v2-612537655266fc4b769c7129cf173f02_r.jpg)

### 诊断器

![](https://pica.zhimg.com/v2-258d1d5080256e7f818cb108461070de_r.jpg)

### 快速修复

![](https://picx.zhimg.com/v2-b27637a4b41fae90e236fd85a6899e39_r.jpg)

### 快速创建 i18n token

通过选中编辑器中的文本，来快速创建一个新的 i18n token 项（快捷键 alt i）

![](https://raw.githubusercontent.com/LSTM-Kirigaya/i18n-Haru/refs/heads/main/images/i18n-add.gif)

### 快速删除 i18n token

如果在 json 文件中，可以通过点击右上角的 i18n 删除按钮同时在所有的 i18n 文件中删除某个 token：

![](https://pic4.zhimg.com/v2-3b172ec3cdfbbe2c211fabcfa837dc07_r.jpg)

---

## 配置

![](https://pic1.zhimg.com/80/v2-6a332b787431a4c1f621ad672f9aa377_1440w.png)

核心只需要配置两个函数（在 `.vscode/setting.json`）：

`i18n-haru-root` ：i18n 根目录的路径（相对或者绝对），i18n-haru 会扫描这个文件夹下所有的 json / yaml 文件，并在去除了后缀名和最长前缀后，用每一个 ISO639 编码去匹配剩余字符串。

`i18n-haru-main` ：i18n 系统的基准语言，默认是 zh-cn，大部分功能，比如自动补全生成的列表，里面的项目基于基准语言的 i18n 项目生成。 相比于基准语言，其他i18n文件没有的部分会发出 error 警告，多余的部分会直接省略。
