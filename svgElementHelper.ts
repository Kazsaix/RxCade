export{Elem}
class Elem {
    elem: Element;

    constructor(svgCanvas: HTMLElement, element_type:string, id: string, parent: Element = svgCanvas) {
        this.elem = document.createElementNS(svgCanvas.namespaceURI, element_type);
        this.attr("id",id)
        parent.appendChild(this.elem);
    }

    getAttr(name: string): string {
      return this.elem.getAttribute(name)!;
    }
    attr(name: string, value: string | number): this {
        this.elem.setAttribute(name, value.toString());
        return this;
      }
    mulAttr(object:any): this {
      for(const k in object) this.attr( k, String(object[k]));
      return this;
    }
    hideElement(condition:boolean) {
      this.attr("visibility", condition ? "hidden" : "visible")
    }

    setTextContent(text:string) {
      this.elem.textContent = text;
    }
}