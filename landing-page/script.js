const form = document.querySelector("#waitlist-form");
const formNote = document.querySelector("#form-note");

if (form && formNote) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const emailInput = form.querySelector("#email");
    if (!(emailInput instanceof HTMLInputElement) || !emailInput.value.trim()) {
      formNote.textContent = "Add an email address to join the waitlist.";
      formNote.classList.remove("is-success");
      return;
    }

    formNote.textContent = "You're on the list. We'll share launch updates soon.";
    formNote.classList.add("is-success");
    form.reset();
  });
}
