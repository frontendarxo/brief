const briefForm = document.querySelector("#brief-form");
const successMessage = document.querySelector("#success-message");
const editBriefButton = document.querySelector("#edit-brief");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const briefNav = document.querySelector(".brief-nav");
const heroSection = document.querySelector(".hero");
const navLinks = [...document.querySelectorAll(".brief-nav__link")];
const formSections = [...document.querySelectorAll(".form-section[id]")];
const canHover = window.matchMedia("(hover: hover)").matches;

const updateNavVisibility = () => {
  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;

  briefNav.classList.toggle("is-visible", window.scrollY > heroBottom - 80);
};

const setActiveSection = (sectionId) => {
  const activeIndex = navLinks.findIndex((link) => link.hash === `#${sectionId}`);

  navLinks.forEach((link) => {
    const linkIndex = navLinks.indexOf(link);
    const isActive = linkIndex === activeIndex;
    const isNeighbor = Math.abs(linkIndex - activeIndex) === 1;

    link.classList.toggle("is-active", isActive);
    link.classList.toggle("is-neighbor", isNeighbor);
  });

  formSections.forEach((section) => {
    section.classList.toggle("is-current", section.id === sectionId);
  });
};

const observeSections = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries.find((entry) => entry.isIntersecting);

      if (visibleEntry) {
        setActiveSection(visibleEntry.target.id);
      }
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
  );

  formSections.forEach((section) => observer.observe(section));
};

const handleNavClick = (event) => {
  const clickedLink = event.target.closest(".brief-nav__link");
  const isExpanded = briefNav.classList.contains("is-expanded");

  if (clickedLink && !isExpanded && !canHover) {
    event.preventDefault();
    briefNav.classList.add("is-expanded");
    return;
  }

  briefNav.classList.toggle("is-expanded", !clickedLink && !isExpanded);
};

const closeNavOnOutsideClick = (event) => {
  if (!briefNav.contains(event.target)) {
    briefNav.classList.remove("is-expanded");
  }
};

const getLabelText = (field) => {
  const label = field.closest("label");
  const labelCopy = label.cloneNode(true);
  const ignoredElements = labelCopy.querySelectorAll("input, select, textarea, .required-badge");

  ignoredElements.forEach((element) => element.remove());
  return labelCopy.textContent.trim().replace(/\s+/g, " ");
};

const getCheckedGroups = () => {
  const checkboxes = [...briefForm.querySelectorAll('input[type="checkbox"]:checked')];
  const groups = checkboxes.reduce((groupedFields, checkbox) => {
    const label = "Функции, которые нужно отключить";
    const values = groupedFields.get(label) ?? [];

    groupedFields.set(label, [...values, getLabelText(checkbox)]);
    return groupedFields;
  }, new Map());

  return [...groups].map(([label, values]) => ({ label, value: values.join(", ") }));
};

const getFilledFields = () => {
  const fields = [...briefForm.elements].filter((field) => field.name && field.type !== "checkbox");

  return fields.reduce((briefFields, field) => {
    const value = field.value.trim();
    return value ? [...briefFields, { label: getLabelText(field), value }] : briefFields;
  }, []);
};

const getBriefFields = () => [...getFilledFields(), ...getCheckedGroups()];

const setSubmitState = (isLoading) => {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Отправляем..." : "Отправить бриф";
};

const sendBrief = async () => {
  const response = await fetch("/api/send-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: getBriefFields() }),
  });

  if (!response.ok) {
    throw new Error("Не удалось отправить бриф. Попробуйте ещё раз.");
  }
};

const showSuccessMessage = () => {
  briefForm.hidden = true;
  successMessage.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const showBriefForm = () => {
  successMessage.hidden = true;
  briefForm.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

briefForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "";
  setSubmitState(true);

  try {
    await sendBrief();
    showSuccessMessage();
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    setSubmitState(false);
  }
});

editBriefButton.addEventListener("click", showBriefForm);
briefNav.addEventListener("click", handleNavClick);
document.addEventListener("click", closeNavOnOutsideClick);
window.addEventListener("scroll", updateNavVisibility, { passive: true });
setActiveSection(formSections[0].id);
updateNavVisibility();
observeSections();
