export{Elem}

/**
 * A class for handling HTMLElements
 */
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

    /**
     * Applies an object to an html elements attributes, with the objects key name as the html name and the key's value as
     * the html value
     * Converts values to string before applying 
     * adapted from Tim Dwyer's Work @https://tgdwyer.github.io/asteroids/
     * @param object collection of key,value pairs to applie to html element
     */
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