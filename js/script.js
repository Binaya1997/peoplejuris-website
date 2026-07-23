console.log("script.js loaded successfully");

let prevScrollPos = window.pageYOffset;

window.onscroll = function () {

    const nav = document.querySelector("nav");

    // Mobile: Always keep the navbar visible
    if (window.innerWidth <= 768) {
        nav.style.top = "0";
        return;
    }

    // Desktop: Hide on scroll down, show on scroll up
    let currentScrollPos = window.pageYOffset;

    if (prevScrollPos > currentScrollPos) {
        nav.style.top = "0";
    } else {
        nav.style.top = "-90px";
    }

    prevScrollPos = currentScrollPos;
};

document.addEventListener("DOMContentLoaded", function () {

    /*=========================================
      DISCLAIMER POPUP
    =========================================*/

    const popup = document.getElementById("disclaimerPopup");
    const agreeBtn = document.getElementById("agreeBtn");

    if (popup) {

        popup.style.display = "flex";

    }

    if (agreeBtn) {

        agreeBtn.addEventListener("click", function () {

            popup.style.display = "none";

        });

    }

    /*=========================================
      MOBILE MENU
    =========================================*/

    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    if (menuToggle && navLinks) {

        menuToggle.addEventListener("click", function () {

            navLinks.classList.toggle("active");

            if (navLinks.classList.contains("active")) {

                menuToggle.textContent = "✕";

            } else {

                menuToggle.textContent = "☰";

            }

        });

    }

    /*=========================================
      NEWSLETTER SEARCH
    =========================================*/

    const searchInput = document.getElementById("newsletterSearch");

    if (searchInput) {

        searchInput.addEventListener("input", function () {

            const searchText = this.value.toLowerCase().trim();

            const cards = document.querySelectorAll(".archive-card");

            cards.forEach(function(card) {

                const cardText = card.textContent.toLowerCase();

                if (cardText.includes(searchText)) {

                    card.style.display = "flex";

                } else {

                    card.style.display = "none";

                }

            });

        });

    }
    
     /*=========================================
NEWSLETTER CATEGORY FILTER
=========================================*/

const filterButtons = document.querySelectorAll(".filter-btn");
const archiveCards = document.querySelectorAll(".archive-card");

filterButtons.forEach(button => {

    button.addEventListener("click", function () {

        filterButtons.forEach(btn =>
            btn.classList.remove("active")
        );

        this.classList.add("active");

        const filter = this.dataset.filter;

        archiveCards.forEach(card => {

            const categories = card.dataset.category.split(" ");

            if (
                filter === "all" ||
                categories.includes(filter)
            ) {

                card.style.display = "flex";

            } else {

                card.style.display = "none";

            }

        });

    });

});

/*=========================================
 NEWSLETTER PAGINATION
=========================================*/

const newsletterCards = document.querySelectorAll(".archive-card");

const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageNumbers = document.getElementById("pageNumbers");


if(newsletterCards.length && prevBtn && nextBtn && pageNumbers){

    let currentPage = 1;

    const cardsPerPage = 4;

    const totalPages = Math.ceil(
        newsletterCards.length / cardsPerPage
    );


    function showNewsletterPage(page){

        currentPage = page;


        newsletterCards.forEach((card,index)=>{

            if(
                index >= (page-1)*cardsPerPage &&
                index < page*cardsPerPage
            ){

                card.style.display="flex";

            }else{

                card.style.display="none";

            }

        });


        document.querySelectorAll(".page-number")
        .forEach(btn=>{

            btn.classList.remove("active");

        });


        document
        .querySelector(`[data-page="${page}"]`)
        ?.classList.add("active");

    }



    for(let i=1;i<=totalPages;i++){

        let btn=document.createElement("span");

        btn.className="page-number";

        btn.dataset.page=i;

        btn.innerHTML=i;


        btn.onclick=function(){

            showNewsletterPage(i);

        };


        pageNumbers.appendChild(btn);

    }



    nextBtn.onclick=function(){

        if(currentPage < totalPages){

            showNewsletterPage(currentPage+1);

        }

    };



    prevBtn.onclick=function(){

        if(currentPage > 1){

            showNewsletterPage(currentPage-1);

        }

    };


    showNewsletterPage(1);

}

});
