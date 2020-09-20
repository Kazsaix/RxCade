export {menu}

/**
 * A menu navigation class for creating links between webpages
 * Sourced from github: @https://github.com/tomik23/webpack-multiple-entry/
 */
const menu = (page:string) => {
    const menuItem = [
        {
            "link": "index.html",
            "title": "RxCade"
        },
        {
            "link": "pong.html",
            "title": "RxPong"
        },
        {
            "link": "breakout.html",
            "title": "RxBreakout"
        }
    ];
    let testItem = '';
    let ulContainer = document.createElement('ul');
    menuItem.forEach(item => {
        const active = item.title === page ? 'class="active"' : '';
        testItem += `<li><a ${active} href='${item.link}'>${item.title}</a></li>`;
    });

    ulContainer.innerHTML = testItem;

    return ulContainer;
}
