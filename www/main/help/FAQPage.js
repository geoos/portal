const faq = [{
    q:"¿Qué es una capa? ¿Cómo puedo añadirla al mapa?",
    a:"Lorem ipsum dolor sit amet consectetur adipiscing elit interdum, elementum semper enim convallis aenean cubilia curabitur, eleifend aliquet laoreet erat class ac natoque. Ligula habitasse lectus malesuada accumsan hendrerit curae quis et, primis nec conubia sagittis"
}, {
    q:"¿Qué es un objeto? ¿Cómo puedo añadirlo al mapa?",
    a:"Lorem ipsum dolor sit amet consectetur adipiscing elit interdum, elementum semper enim convallis aenean cubilia curabitur, eleifend aliquet laoreet erat class ac natoque. Ligula habitasse lectus malesuada accumsan hendrerit curae quis et, primis nec conubia sagittis"
}, {
    q:"¿Qué es una estación? ¿Cómo puedo añadirla al mapa?",
    a:"Lorem ipsum dolor sit amet consectetur adipiscing elit interdum, elementum semper enim convallis aenean cubilia curabitur, eleifend aliquet laoreet erat class ac natoque. Ligula habitasse lectus malesuada accumsan hendrerit curae quis et, primis nec conubia sagittis"
}, {
    q:"¿Que tipo de visualizadores existen en GEOOs?",
    a:"Lorem ipsum dolor sit amet consectetur adipiscing elit interdum, elementum semper enim convallis aenean cubilia curabitur, eleifend aliquet laoreet erat class ac natoque. Ligula habitasse lectus malesuada accumsan hendrerit curae quis et, primis nec conubia sagittis"
}]
class FAQPagr extends ZCustomController {
    onThis_init() {
        let html = faq.reduce((html, f, idx) => {
            html += `
                <div class='faq-q' data-idx='${idx}'>
                    <i class="fas fa-chevron-right float-left mr-2 ${f.open?" expanded":""}"></i>
                    ${f.q}
                </div>
                <div class='faq-a' data-idx='${idx}'>
                    ${f.a}
                </div>
            `
            return html;
        }, "");
        this.faqContainer.html = html;
        let cnt = $(this.faqContainer.view);
        cnt.find(".faq-a").hide();
        cnt.find(".faq-q").click(e => {
            let q = $(e.currentTarget);
            let idx = parseInt(q.data("idx"));
            let f = faq[idx];
            let a = cnt.find(".faq-a[data-idx='" + idx + "']");
            if (f.open) {
                q.find("i").removeClass("expanded");
                a.animate({height:0}, 300, _ => {
                    a.hide();
                    f.open = false;
                })
            } else {
                a.css({height:0});
                a.show();
                q.find("i").addClass("expanded");
                a.animate({height:100}, 300, _ => {
                    f.open = true;
                    a.css({height:""});
                })
            }
        })
    }
}
ZVC.export(FAQPagr);