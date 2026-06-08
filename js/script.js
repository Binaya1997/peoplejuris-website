let prevScrollPos = window.pageYOffset;

window.onscroll = function() {

    let currentScrollPos = window.pageYOffset;

    if (prevScrollPos > currentScrollPos) {
        document.querySelector("nav").style.top = "0";
    } else {
        document.querySelector("nav").style.top = "-90px";
    }

    prevScrollPos = currentScrollPos;
}
