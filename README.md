## i18n Haru

中文教程 | [English Tutorial](https://www.pandanese.com/blog/chinese-learning-websites)

## 使用示例

### 悬停提示 和 inlay hints

![](https://picx.zhimg.com/80/v2-82b8c18cd2711ba8c32cdd3b28db5261_1440w.png)

### 自动补全

![](https://pic1.zhimg.com/80/v2-e5be8dc5eae4f98adc4e63eb2f5cf0bd_1440w.jpeg)

### 定义跳转

![](https://picx.zhimg.com/80/v2-e354c132b862c4f3697ff3e879b1f417_1440w.png)

### 诊断器

![](https://picx.zhimg.com/v2-ac7598133688b3d319c9401f0ed5d3c5_r.jpg)

### 快速修复

![](https://pic4.zhimg.com/80/v2-da391548d13d860cb3760a0e024fc627_1440w.webp)

### 快速创建 i18n token

通过选中编辑器中的文本，来快速创建一个新的 i18n token 项（快捷键 alt i）

![](https://raw.githubusercontent.com/LSTM-Kirigaya/i18n-Haru/refs/heads/main/images/i18n-add.gif)

### 快速删除 i18n token

如果在 json 文件中，可以通过点击右上角的 i18n 删除按钮同时在所有的 i18n 文件中删除某个 token：

![](https://pic3.zhimg.com/v2-6194363b9eb4747a53396a681b1be55c_r.jpg)

---

## 配置

![](https://pic1.zhimg.com/80/v2-6a332b787431a4c1f621ad672f9aa377_1440w.png)

核心只需要配置两个函数：

`i18n-haru-root` ：i18n 根目录的路径（相对或者绝对），i18n-haru 会扫描这个文件夹下所有的 json / yaml 文件，并在去除了后缀名和最长前缀后，用每一个 ISO639 编码去匹配剩余字符串。

`i18n-haru-main` ：i18n 系统的基准语言，默认是 zh-cn，大部分功能，比如自动补全生成的列表，里面的项目基于基准语言的 i18n 项目生成。 相比于基准语言，其他i18n文件没有的部分会发出 error 警告，多余的部分会直接省略。
