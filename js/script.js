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
 DISCLAIMER PANEL - SHOW ONLY ONCE
=========================================*/

const popup = document.getElementById("disclaimerPopup");
const agreeBtn = document.getElementById("agreeBtn");

if (popup) {

    const alreadyAccepted = localStorage.getItem("peoplejurisDisclaimerAccepted");

    if (alreadyAccepted === "true") {

        popup.style.display = "none";

    } else {

        // prevent background scroll
        document.body.style.overflow = "hidden";

        setTimeout(() => {
            popup.classList.add("show");
        }, 500);

        if (agreeBtn) {

            agreeBtn.addEventListener("click", function () {

                popup.classList.remove("show");

                localStorage.setItem("peoplejurisDisclaimerAccepted", "true");

                // restore scrolling
                document.body.style.overflow = "";

                setTimeout(() => {
                    popup.style.display = "none";
                }, 500);
            });
        }
    }
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

/* ==================================================
   PEOPLEJURIS AI HELP CHAT
================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const chatButton = document.getElementById("pjChatButton");
    const chatBox = document.getElementById("pjChatBox");
    const chatClose = document.getElementById("pjChatClose");
    const chatInput = document.getElementById("pjChatInput");
    const chatSend = document.getElementById("pjChatSend");
    const chatMessages = document.getElementById("pjChatMessages");
    const quickQuestions = document.querySelectorAll(".pj-quick-questions button");

    /* -----------------------------------------------
       OPEN CHAT
    ----------------------------------------------- */

    if (chatButton && chatBox) {
        chatButton.addEventListener("click", function () {
            chatBox.classList.add("active");

            setTimeout(function () {
                if (chatInput) {
                    chatInput.focus();
                }
            }, 100);
        });
    }

    /* -----------------------------------------------
       CLOSE CHAT
    ----------------------------------------------- */

    if (chatClose && chatBox) {
        chatClose.addEventListener("click", function () {
            chatBox.classList.remove("active");
        });
    }

    /* -----------------------------------------------
       ADD MESSAGE
    ----------------------------------------------- */

    function addMessage(text, sender) {
        const message = document.createElement("div");
        message.className = "pj-message " + (sender === "user" ? "pj-user" : "pj-bot");

        const bubble = document.createElement("div");
        bubble.className = "pj-message-bubble";
        bubble.textContent = text;

        message.appendChild(bubble);
        chatMessages.appendChild(message);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /* -----------------------------------------------
       SMART FREE PEOPLEJURIS ANSWERS
    ----------------------------------------------- */

    function getAnswer(question) {

        const q = question.toLowerCase().trim();

        /* ===== PeopleJuris Information ===== */

        if (q.includes("service") || q.includes("practice area")) {
            return "PeopleJuris provides legal services in Civil Law, Criminal Law, Family Law, Property Law, Corporate Law, Consumer Law, IP Law and Legal Consultation.";
        }

        if (q.includes("contact") || q.includes("phone") || q.includes("email")) {
            return "You can contact PeopleJuris at +91 8763830030, or email info@peoplejuris.com.";
        }

        if (q.includes("address") || q.includes("location") || q.includes("office") || q.includes("located") || q.includes("where is peoplejuris") || q.includes("where are you located") || q.includes("office") || q.includes("rayagada")  ) {
            return "PeopleJuris is located at Laxmi Nilayam, OLD SBI Lane, Near Dukum Road Square, Bissam Cuttack, Rayagada, Odisha – 765019.";
        }

        if (q.includes("intern") || q.includes("career")) {
            return "You can apply for internship opportunities through the Career page on the PeopleJuris website.";
        }

        if (q.includes("newsletter")) {
            return "Visit the Newsletter page to read and download PeopleJuris legal newsletters and updates.";
        }

        /* ===== Legal Awareness ===== */

        if (q.includes("consumer law") || q.includes("consumer complaint")) {
            return "Consumer law protects consumers against defective goods, deficient services and unfair trade practices. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("civil law")) {
            return "Civil law generally deals with disputes involving property, contracts, recovery claims and other civil rights matters. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("criminal law")) {
            return "Criminal law deals with offences against the State such as theft, assault, cheating and other punishable acts. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("family law") || q.includes("divorce")) {
            return "Family law generally covers marriage, divorce, maintenance, custody and related family matters. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("property law") || q.includes("land")) {
            return "Property law generally deals with ownership, transfer, registration, possession and inheritance matters relating to immovable property. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("corporate law") || q.includes("company") || q.includes("business law")) {
            return "Corporate law generally covers company formation, contracts, compliance, governance and commercial transactions. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("fir")) {
            return "An FIR is the First Information Report recorded by the police regarding a cognizable offence and enables investigation to begin. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("bail")) {
            return "Bail is the temporary release of an accused person from custody on conditions imposed by the court while the criminal case continues. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("cheque bounce") || q.includes("section 138")) {
            return "Cheque bounce matters are commonly dealt with under Section 138 of the Negotiable Instruments Act when a cheque is dishonoured and the statutory requirements are satisfied. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("partition")) {
            return "A partition dispute generally involves the division of jointly owned family or ancestral property among co-owners or legal heirs. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("legal notice")) {
            return "A legal notice is a formal communication used to assert a legal right or seek compliance before initiating legal proceedings. This information is general in nature and does not constitute legal advice.";
        }

        if (q.includes("founder") || q.includes("chandramouli")) {
            return "PeopleJuris traces its legacy to Advocate Mr. Chandramouli Patnaik, who founded People’s Law Home in 1985 at Bissam Cuttack and worked extensively on land rights and social justice matters.";
        }

        if (q.includes("swadhin")) {
            return "Mr. Swadhin Patnaik is part of the current leadership of PeopleJuris and focuses on Corporate Advisory, Consumer Protection, Compliance and Business Law services.";
        }

        /* ===== Greetings ===== */

        if (q === "hi" || q === "hello" || q === "hey") {
            return "Hello! 👋 Welcome to PeopleJuris. I can help you with information about our practice areas, contact details, internship opportunities, newsletters and general legal-awareness topics.";
        }

        /* ===== Default ===== */

        return "I can help you with information about PeopleJuris, including practice areas, contact details, office location, internship opportunities, newsletters and general legal-awareness topics. Please note that this chat provides general information only and does not create a lawyer-client relationship or provide legal advice.";
    }

    /* -----------------------------------------------
       SEND MESSAGE
    ----------------------------------------------- */

    function sendMessage() {

        if (!chatInput || !chatMessages) return;

        const text = chatInput.value.trim();

        if (!text) return;

        addMessage(text, "user");
        chatInput.value = "";

        setTimeout(function () {
            const answer = getAnswer(text);
            addMessage(answer, "bot");
        }, 500);
    }

    /* -----------------------------------------------
       SEND BUTTON
    ----------------------------------------------- */

    if (chatSend) {
        chatSend.addEventListener("click", sendMessage);
    }

    /* -----------------------------------------------
       ENTER KEY
    ----------------------------------------------- */

    if (chatInput) {
        chatInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    /* -----------------------------------------------
       QUICK QUESTIONS
    ----------------------------------------------- */

    quickQuestions.forEach(function (button) {
        button.addEventListener("click", function () {
            const question = this.dataset.question;

            if (!question) return;

            addMessage(question, "user");

            setTimeout(function () {
                const answer = getAnswer(question);
                addMessage(answer, "bot");
            }, 500);
        });
    });

});
