class 포스트 extends HTMLElement {
    connectedCallback(){
        // let title = this.getAttribute('title')
        // let content = this.getAttribute('content')
        this.innerHTML = /*html*/`
        <div class="list-box">
            <h4>안녕</h4>
            <p></p>
        </div>
        `
    }
}
customElements.define('Post',포스트)

export default Post