let prevScrollPos = window.pageYOffset;

window.onscroll = function () {

    let currentScrollPos = window.pageYOffset;

    if (prevScrollPos > currentScrollPos) {
        document.querySelector("nav").style.top = "0";
    } else {
        document.querySelector("nav").style.top = "-90px";
    }

    prevScrollPos = currentScrollPos;
};

document.addEventListener("DOMContentLoaded", function () {

    console.log("Script loaded");

    const popup = document.getElementById("disclaimerPopup");
    const agreeBtn = document.getElementById("agreeBtn");

    console.log(popup);
    console.log(agreeBtn);

    if (localStorage.getItem("peoplejurisDisclaimer") === "accepted") {
        popup.style.display = "none";
    }

    agreeBtn.addEventListener("click", function () {
        localStorage.setItem("peoplejurisDisclaimer", "accepted");
        popup.style.display = "none";
    });

});


