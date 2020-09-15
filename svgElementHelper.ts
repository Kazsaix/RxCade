

class Elem {
    elem: Element;

    constructor(svg: HTMLElement, id:string, parent: Element = svg) {
        this.elem = document.createElementNS(svg.namespaceURI, id);
        parent.appendChild(this.elem);
    }

    attr(name: string): string
    attr(name: string, value: string | number): this
    attr(name: string, value?: string | number): this | string {
        if (typeof value === 'undefined') {
          return this.elem.getAttribute(name)!;
        }
        this.elem.setAttribute(name, value.toString());
        return this;
      }
}