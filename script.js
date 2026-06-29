const briefForm = document.querySelector("#brief-form");
const successMessage = document.querySelector("#success-message");
const editBriefButton = document.querySelector("#edit-brief");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const briefNav = document.querySelector(".brief-nav");
const heroSection = document.querySelector(".hero");
const successCard = successMessage.querySelector(".success-message__card");
const navLinks = [...document.querySelectorAll(".brief-nav__link")];
const formSections = [...document.querySelectorAll(".form-section[id]")];
const canHover = window.matchMedia("(hover: hover)").matches;
const NAV_VISIBILITY_OFFSET = 80;
const SECTION_FOCUS_OFFSET = 140;
const ESCAPE_KEY = "Escape";

const updateNavVisibility = () => {
  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;

  briefNav.classList.toggle("is-visible", window.scrollY > heroBottom - NAV_VISIBILITY_OFFSET);
};

const scrollActiveLinkIntoView = () => {
  const activeLink = briefNav.querySelector(".brief-nav__link.is-active");

  activeLink?.scrollIntoView({ block: "nearest", inline: "center" });
};

const setActiveSection = (sectionId) => {
  const activeIndex = navLinks.findIndex((link) => link.hash === `#${sectionId}`);

  navLinks.forEach((link) => {
    const linkIndex = navLinks.indexOf(link);
    const isActive = linkIndex === activeIndex;
    const isNeighbor = Math.abs(linkIndex - activeIndex) === 1;

    link.classList.toggle("is-active", isActive);
    link.classList.toggle("is-neighbor", isNeighbor);
    link.toggleAttribute("aria-current", isActive);
  });

  formSections.forEach((section) => {
    section.classList.toggle("is-current", section.id === sectionId);
  });

  if (briefNav.classList.contains("is-expanded")) {
    scrollActiveLinkIntoView();
  }
};

const getCurrentSectionId = () => {
  const currentSection = formSections.reduce((closestSection, section) => {
    const sectionDistance = Math.abs(section.getBoundingClientRect().top - SECTION_FOCUS_OFFSET);
    const closestDistance = Math.abs(closestSection.getBoundingClientRect().top - SECTION_FOCUS_OFFSET);

    return sectionDistance < closestDistance ? section : closestSection;
  }, formSections[0]);

  return currentSection.id;
};

const updateActiveSection = () => {
  setActiveSection(getCurrentSectionId());
};

const handleNavClick = (event) => {
  const clickedLink = event.target.closest(".brief-nav__link");
  const isExpanded = briefNav.classList.contains("is-expanded");

  if (clickedLink && !isExpanded && !canHover) {
    event.preventDefault();
    briefNav.classList.add("is-expanded");
    scrollActiveLinkIntoView();
    return;
  }

  briefNav.classList.toggle("is-expanded", !clickedLink && !isExpanded);

  if (!isExpanded) {
    scrollActiveLinkIntoView();
  }
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

const getSendErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.error || "Не удалось отправить бриф. Попробуйте ещё раз.";
  } catch (error) {
    return "Не удалось отправить бриф. Попробуйте ещё раз.";
  }
};

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
    throw new Error(await getSendErrorMessage(response));
  }
};

const showSuccessMessage = () => {
  successMessage.hidden = false;
  document.body.classList.add("has-modal");
  editBriefButton.focus();
};

const showBriefForm = () => {
  successMessage.hidden = true;
  document.body.classList.remove("has-modal");
  submitButton.focus();
};

const handleSuccessMessageClick = (event) => {
  if (!successCard.contains(event.target)) {
    showBriefForm();
  }
};

const handleEscapePress = (event) => {
  if (event.key === ESCAPE_KEY && !successMessage.hidden) {
    showBriefForm();
  }
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
successMessage.addEventListener("click", handleSuccessMessageClick);
briefNav.addEventListener("click", handleNavClick);
document.addEventListener("click", closeNavOnOutsideClick);
document.addEventListener("keydown", handleEscapePress);
window.addEventListener("scroll", updateNavVisibility, { passive: true });
window.addEventListener("scroll", updateActiveSection, { passive: true });
updateActiveSection();
updateNavVisibility();
