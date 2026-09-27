const BRIEF_TYPE = "logo";
const NAV_VISIBILITY_OFFSET = 80;
const SECTION_FOCUS_OFFSET = 140;
const ESCAPE_KEY = "Escape";
const TOAST_VISIBLE_MS = 2200;
const EMPTY_VALUE = "не указано";
const MAX_REFERENCE_ITEMS = 5;

const briefForm = document.querySelector("#brief-form");
const resultScreen = document.querySelector("#result-screen");
const summaryBlock = document.querySelector("#summary-block");
const promptBox = document.querySelector("#prompt-box");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const resultStatus = document.querySelector("#result-status");
const briefNav = document.querySelector(".brief-nav");
const heroSection = document.querySelector(".hero");
const copyToast = document.querySelector("#copy-toast");
const navLinks = [...document.querySelectorAll(".brief-nav__link")];
const formSections = [...document.querySelectorAll(".form-section[id]")];
const canHover = window.matchMedia("(hover: hover)").matches;

let latestPrompt = "";
let latestBriefText = "";
let toastTimerId = 0;

const joinValues = (values) => values.filter(Boolean).join(", ");

const valueOrFallback = (value) => {
  const trimmed = value?.trim();
  return trimmed || EMPTY_VALUE;
};

const getCheckedValues = (name) =>
  [...briefForm.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);

const getRadioValue = (name) => briefForm.elements[name]?.value?.trim() || "";

const getFieldValue = (name) => briefForm.elements[name]?.value?.trim() || "";

const updateNavVisibility = () => {
  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
  briefNav.classList.toggle("is-visible", window.scrollY > heroBottom - NAV_VISIBILITY_OFFSET);
};

const scrollActiveLinkIntoView = () => {
  briefNav.querySelector(".brief-nav__link.is-active")?.scrollIntoView({
    block: "nearest",
    inline: "center",
  });
};

const setActiveSection = (sectionId) => {
  const activeIndex = navLinks.findIndex((link) => link.hash === `#${sectionId}`);

  navLinks.forEach((link, linkIndex) => {
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

const updateActiveSection = () => setActiveSection(getCurrentSectionId());

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

const syncConditionalFields = () => {
  document.querySelectorAll(".conditional-field[data-depends]").forEach((field) => {
    const dependsOn = field.dataset.depends;
    const expected = field.dataset.when;
    const isVisible = getRadioValue(dependsOn) === expected;
    field.classList.toggle("is-visible", isVisible);
  });

  document.querySelectorAll(".conditional-field[data-depends-checkbox]").forEach((field) => {
    const dependsOn = field.dataset.dependsCheckbox;
    const expected = field.dataset.when;
    const isVisible = getCheckedValues(dependsOn).includes(expected);
    field.classList.toggle("is-visible", isVisible);
  });
};

const enforceCheckboxLimit = (event) => {
  const checkbox = event.target;
  if (checkbox.type !== "checkbox" || !checkbox.checked) {
    return;
  }

  const group = checkbox.closest("[data-max-checks]");
  if (!group) {
    return;
  }

  const maxChecks = Number(group.dataset.maxChecks);
  const checked = group.querySelectorAll(`input[name="${checkbox.name}"]:checked`);

  if (checked.length <= maxChecks) {
    return;
  }

  checkbox.checked = false;
  formStatus.textContent = `Для «${group.dataset.maxLabel}» можно выбрать не больше ${maxChecks}.`;
};

const getLabelText = (field) => {
  const label = field.closest("label");
  if (!label) {
    return field.name;
  }

  const labelCopy = label.cloneNode(true);
  labelCopy
    .querySelectorAll("input, select, textarea, .required-badge, .term-tip, .term-tip__popup")
    .forEach((element) => {
      element.remove();
    });

  return labelCopy.textContent.trim().replace(/\s+/g, " ") || field.name;
};

const getCheckedGroups = () => {
  const checkboxes = [...briefForm.querySelectorAll('input[type="checkbox"]:checked')];
  const groups = checkboxes.reduce((groupedFields, checkbox) => {
    const label = getLabelText(checkbox).replace(checkbox.value, "").trim() || checkbox.name;
    const groupLabel = checkbox.name;
    const values = groupedFields.get(groupLabel) ?? [];
    groupedFields.set(groupLabel, [...values, checkbox.value]);
    return groupedFields;
  }, new Map());

  const labelMap = {
    businessCategories: "Категории бизнеса",
    audienceGroups: "Целевые группы",
    geography: "География",
    positioning: "Позиционирование",
    personality: "Характер бренда",
    visualStyle: "Визуальный стиль",
    logoTypes: "Тип логотипа",
    likedColors: "Любимые цвета",
    typographyStyle: "Характер шрифта",
    languages: "Языки",
    usage: "Где используется",
    priorities: "Приоритеты",
  };

  return [...groups].map(([name, values]) => ({
    label: labelMap[name] || name,
    value: values.join(", "),
  }));
};

const getFilledFields = () => {
  const fields = [...briefForm.elements].filter(
    (field) => field.name && field.type !== "checkbox" && field.type !== "radio",
  );

  return fields.reduce((briefFields, field) => {
    const value = field.value.trim();
    return value ? [...briefFields, { label: getLabelText(field), value }] : briefFields;
  }, []);
};

const getFilledRadios = () => {
  const radios = [...briefForm.querySelectorAll('input[type="radio"]:checked')];

  return radios.map((radio) => ({
    label: radio.closest(".field-group")?.querySelector(".field-group__title")?.textContent.trim()
      || getLabelText(radio),
    value: radio.value,
  }));
};

const getBriefFields = () => [...getFilledFields(), ...getFilledRadios(), ...getCheckedGroups()];

const collectReferences = (kind) => {
  const prefix = kind === "anti" ? "antiReferenceUrl" : "referenceUrl";
  const whyPrefix = kind === "anti" ? null : "referenceWhy";
  const items = [];

  for (let index = 1; index <= MAX_REFERENCE_ITEMS; index += 1) {
    const url = getFieldValue(`${prefix}${index}`);
    if (!url) {
      continue;
    }

    const why = whyPrefix ? getFieldValue(`${whyPrefix}${index}`) : "";
    items.push(why ? `${url} — ${why}` : url);
  }

  return items;
};

const collectCompetitors = () =>
  [1, 2, 3, 4, 5].map((index) => getFieldValue(`competitor${index}`)).filter(Boolean);

const buildAnswers = () => {
  const positioning = getCheckedValues("positioning");
  const positioningOther = getFieldValue("positioningOther");
  const priorities = getCheckedValues("priorities");
  const prioritiesOther = getFieldValue("prioritiesOther");
  const likedColors = getCheckedValues("likedColors");
  const likedColorsOther = getFieldValue("likedColorsOther");
  const languages = getCheckedValues("languages");
  const languagesOther = getFieldValue("languagesOther");
  const usage = getCheckedValues("usage");
  const usageOther = getFieldValue("usageOther");
  const businessCategories = getCheckedValues("businessCategories");
  const businessOther = getFieldValue("businessOther");

  return {
    brandName: getFieldValue("brandName"),
    brandNameAlt: getFieldValue("brandNameAlt"),
    slogan: getRadioValue("hasSlogan") === "Да" ? getFieldValue("slogan") : "",
    businessCategories: joinValues([
      ...businessCategories.filter((item) => item !== "Другое"),
      businessOther,
    ]),
    businessDescription: getFieldValue("businessDescription"),
    mainProduct: getFieldValue("mainProduct"),
    keyProducts: getFieldValue("keyProducts"),
    heroProduct: getRadioValue("hasHeroProduct") === "Да" ? getFieldValue("heroProduct") : "",
    audienceGroups: joinValues(getCheckedValues("audienceGroups")),
    audienceAge: getRadioValue("audienceAge"),
    geography: joinValues(getCheckedValues("geography")),
    regions: getFieldValue("regions"),
    positioning: joinValues([
      ...positioning.filter((item) => item !== "Другой"),
      positioningOther,
    ]),
    personality: joinValues(getCheckedValues("personality")),
    visualStyle: joinValues(getCheckedValues("visualStyle")),
    minimalismLevel: getRadioValue("minimalismLevel"),
    logoTypes: joinValues(getCheckedValues("logoTypes")),
    desiredSymbol: getRadioValue("wantsSymbol") === "Да" ? getFieldValue("desiredSymbol") : "",
    symbolIdeas: getFieldValue("symbolIdeas"),
    forbiddenSymbols: getFieldValue("forbiddenSymbols"),
    likedColors: joinValues([
      ...likedColors.filter((item) => item !== "Другое"),
      likedColorsOther,
    ]),
    brandColors: getFieldValue("brandColors"),
    forbiddenColors: getFieldValue("forbiddenColors"),
    typographyStyle: joinValues(getCheckedValues("typographyStyle")),
    needsArabic: getRadioValue("needsArabic"),
    languages: joinValues([
      ...languages.filter((item) => item !== "Другой"),
      languagesOther,
    ]),
    references: collectReferences("reference"),
    antiReferences: collectReferences("anti"),
    antiReferenceWhy: getFieldValue("antiReferenceWhy"),
    competitors: collectCompetitors(),
    differentiate: getRadioValue("differentiate"),
    differentiateHow:
      getRadioValue("differentiate") === "Да" ? getFieldValue("differentiateHow") : "",
    brandFeatures: getFieldValue("brandFeatures"),
    usage: joinValues([...usage.filter((item) => item !== "Другое"), usageOther]),
    smallSizeImportance: getRadioValue("smallSizeImportance"),
    needsIcon: getRadioValue("needsIcon"),
    subbrands: getRadioValue("hasSubbrands") === "Да" ? getFieldValue("subbrands") : "",
    brandGrowth: getRadioValue("brandGrowth"),
    designerRestrictions: getFieldValue("designerRestrictions"),
    legalConstraints:
      getRadioValue("hasLegalConstraints") === "Да" ? getFieldValue("legalConstraints") : "",
    desiredFeeling: getFieldValue("desiredFeeling"),
    idealLogoSentence: getFieldValue("idealLogoSentence"),
    priorities: joinValues([
      ...priorities.filter((item) => item !== "Другое"),
      prioritiesOther,
    ]),
    extraInfo: getFieldValue("extraInfo"),
    contactName: getFieldValue("contactName"),
    contactInfo: getFieldValue("contactInfo"),
  };
};

const buildSummary = (answers) => {
  const audienceParts = [
    answers.audienceGroups,
    answers.audienceAge && `возраст: ${answers.audienceAge}`,
    answers.geography,
    answers.regions,
  ].filter(Boolean);

  const colorParts = [
    answers.likedColors,
    answers.brandColors && `брендовые: ${answers.brandColors}`,
  ].filter(Boolean);

  const avoidParts = [
    answers.antiReferences.join("; "),
    answers.antiReferenceWhy,
    answers.forbiddenSymbols && `символы: ${answers.forbiddenSymbols}`,
    answers.forbiddenColors && `цвета: ${answers.forbiddenColors}`,
    answers.designerRestrictions,
    answers.legalConstraints,
  ].filter(Boolean);

  const symbolismParts = [answers.desiredSymbol, answers.symbolIdeas].filter(Boolean);
  const usageParts = [
    answers.usage,
    answers.smallSizeImportance && `маленький размер: ${answers.smallSizeImportance}`,
    answers.needsIcon && `отдельная иконка: ${answers.needsIcon}`,
  ].filter(Boolean);

  return [
    {
      title: "1. Brand Summary",
      text: [
        answers.brandName,
        answers.brandNameAlt && `также: ${answers.brandNameAlt}`,
        answers.slogan && `слоган: ${answers.slogan}`,
        answers.businessCategories,
        answers.businessDescription,
        answers.mainProduct,
      ]
        .filter(Boolean)
        .join(". ") || EMPTY_VALUE,
    },
    {
      title: "2. Design Direction",
      text: [
        answers.visualStyle,
        answers.minimalismLevel && `минимализм: ${answers.minimalismLevel}/5`,
        answers.positioning,
      ]
        .filter(Boolean)
        .join(". ") || EMPTY_VALUE,
    },
    {
      title: "3. Logo Type",
      text: answers.logoTypes || EMPTY_VALUE,
    },
    {
      title: "4. Color System",
      text: colorParts.join(". ") || EMPTY_VALUE,
    },
    {
      title: "5. Typography",
      text: [
        answers.typographyStyle,
        answers.languages && `языки: ${answers.languages}`,
        answers.needsArabic && `арабская версия: ${answers.needsArabic}`,
      ]
        .filter(Boolean)
        .join(". ") || EMPTY_VALUE,
    },
    {
      title: "6. Symbolism",
      text: symbolismParts.join(". ") || EMPTY_VALUE,
    },
    {
      title: "7. References",
      text: answers.references.join("\n") || EMPTY_VALUE,
    },
    {
      title: "8. Anti-References",
      text: avoidParts.join("\n") || EMPTY_VALUE,
    },
    {
      title: "9. Usage",
      text: usageParts.join(". ") || EMPTY_VALUE,
    },
    {
      title: "10. Design Constraints",
      text: [
        answers.brandFeatures,
        answers.competitors.length && `конкуренты: ${answers.competitors.join(", ")}`,
        answers.differentiateHow && `отличаться: ${answers.differentiateHow}`,
        answers.subbrands && `подбренды: ${answers.subbrands}`,
        answers.brandGrowth && `развитие: ${answers.brandGrowth}`,
        answers.extraInfo,
      ]
        .filter(Boolean)
        .join("\n") || EMPTY_VALUE,
    },
    {
      title: "Audience & Feeling",
      text: [
        audienceParts.join("; "),
        answers.personality && `характер: ${answers.personality}`,
        answers.desiredFeeling,
        answers.idealLogoSentence && `«${answers.idealLogoSentence}»`,
        answers.priorities && `приоритеты: ${answers.priorities}`,
      ]
        .filter(Boolean)
        .join("\n") || EMPTY_VALUE,
    },
  ];
};

const buildPrompt = (answers) => {
  const audience = [
    answers.audienceGroups,
    answers.audienceAge,
    answers.geography,
    answers.regions,
  ]
    .filter(Boolean)
    .join("; ");

  const symbolism = [answers.desiredSymbol, answers.symbolIdeas].filter(Boolean).join("; ");
  const colors = [answers.likedColors, answers.brandColors].filter(Boolean).join("; ");
  const typography = [
    answers.typographyStyle,
    answers.languages && `languages: ${answers.languages}`,
    answers.needsArabic && `Arabic version: ${answers.needsArabic}`,
  ]
    .filter(Boolean)
    .join("; ");

  const avoid = [
    answers.antiReferences.join("; "),
    answers.antiReferenceWhy,
    answers.forbiddenSymbols,
    answers.forbiddenColors,
    answers.designerRestrictions,
    answers.legalConstraints,
  ]
    .filter(Boolean)
    .join("; ");

  const special = [
    answers.brandFeatures,
    answers.brandNameAlt && `alt name: ${answers.brandNameAlt}`,
    answers.slogan && `slogan: ${answers.slogan}`,
    answers.needsIcon && `standalone icon: ${answers.needsIcon}`,
    answers.smallSizeImportance && `small size: ${answers.smallSizeImportance}`,
    answers.extraInfo,
  ]
    .filter(Boolean)
    .join("; ");

  const perception = [answers.desiredFeeling, answers.idealLogoSentence]
    .filter(Boolean)
    .join("; ");

  return [
    `Create a professional logo identity for ${valueOrFallback(answers.brandName)}.`,
    "",
    `Business: ${valueOrFallback(
      [answers.businessCategories, answers.businessDescription, answers.mainProduct]
        .filter(Boolean)
        .join(". "),
    )}`,
    "",
    `Target audience: ${valueOrFallback(audience)}`,
    "",
    `Brand positioning: ${valueOrFallback(answers.positioning)}`,
    "",
    `Brand personality: ${valueOrFallback(answers.personality)}`,
    "",
    `Visual direction: ${valueOrFallback(
      [answers.visualStyle, answers.minimalismLevel && `minimalism ${answers.minimalismLevel}/5`]
        .filter(Boolean)
        .join(", "),
    )}`,
    "",
    `Logo type: ${valueOrFallback(answers.logoTypes)}`,
    "",
    `Symbolism: ${valueOrFallback(symbolism)}`,
    "",
    `Color palette: ${valueOrFallback(colors)}`,
    "",
    `Typography: ${valueOrFallback(typography)}`,
    "",
    `References: ${valueOrFallback(answers.references.join("; "))}`,
    "",
    `Avoid: ${valueOrFallback(avoid)}`,
    "",
    `Usage: ${valueOrFallback(answers.usage)}`,
    "",
    `Special requirements: ${valueOrFallback(special)}`,
    "",
    "Develop several distinct logo concepts while maintaining a clear and coherent brand strategy.",
    "",
    "The logo must be distinctive, scalable, recognizable, and functional across digital and physical applications.",
    "",
    "Avoid generic templates, excessive details, unnecessary visual elements, clichés, and direct imitation of existing brands.",
    "",
    `Prioritize ${valueOrFallback(answers.priorities)}.`,
    "",
    `The final identity should communicate ${valueOrFallback(perception)}.`,
  ].join("\n");
};

const buildDownloadText = (answers, summary, prompt) => {
  const summaryText = summary
    .map((item) => `${item.title}\n${item.text}`)
    .join("\n\n");

  const contactLines = [
    answers.contactName ? `Контакт: ${answers.contactName}` : null,
    answers.contactInfo ? `Связь: ${answers.contactInfo}` : null,
  ].filter(Boolean);

  return [
    "БРИФ НА ЛОГОТИП",
    "",
    `Бренд: ${answers.brandName || EMPTY_VALUE}`,
    ...contactLines,
    "",
    summaryText,
    "",
    "--- AI PROMPT ---",
    "",
    prompt,
  ].join("\n");
};

const renderSummary = (summary) => {
  summaryBlock.innerHTML = summary
    .map(
      (item) => `
        <article class="summary-item">
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </article>
      `,
    )
    .join("");
};

const showResultScreen = () => {
  briefForm.classList.add("is-hidden");
  briefNav.classList.remove("is-visible", "is-expanded");
  resultScreen.hidden = false;
  resultScreen.classList.add("is-visible");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const showBriefForm = () => {
  resultScreen.hidden = true;
  resultScreen.classList.remove("is-visible");
  briefForm.classList.remove("is-hidden");
  updateNavVisibility();
  updateActiveSection();
  submitButton.focus();
};

const resetBrief = () => {
  briefForm.reset();
  syncConditionalFields();
  document.querySelectorAll("[data-kind]").forEach((list) => {
    const items = [...list.querySelectorAll("[data-item]")];
    items.slice(1).forEach((item) => item.remove());
    renameListItems(list);
  });
  formStatus.textContent = "";
  latestPrompt = "";
  latestBriefText = "";
  showBriefForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const showToast = (message) => {
  copyToast.textContent = message;
  copyToast.classList.add("is-visible");
  window.clearTimeout(toastTimerId);
  toastTimerId = window.setTimeout(() => {
    copyToast.classList.remove("is-visible");
  }, TOAST_VISIBLE_MS);
};

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(latestPrompt);
    showToast("Промпт скопирован");
  } catch (error) {
    formStatus.textContent = "Не удалось скопировать промпт.";
  }
};

const downloadBrief = () => {
  const blob = new Blob([latestBriefText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const brandSlug = getFieldValue("brandName").toLowerCase().replace(/\s+/g, "-") || "logo";

  link.href = url;
  link.download = `logo-brief-${brandSlug}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

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
  submitButton.textContent = isLoading ? "Собираем и отправляем..." : "Собрать бриф и отправить";
};

const sendBrief = async ({ fields, prompt }) => {
  const response = await fetch("/api/send-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, prompt, briefType: BRIEF_TYPE }),
  });

  if (!response.ok) {
    throw new Error(await getSendErrorMessage(response));
  }
};

const renameListItems = (list) => {
  const kind = list.dataset.kind;
  const items = [...list.querySelectorAll("[data-item]")];

  items.forEach((item, index) => {
    const number = index + 1;
    const title = item.querySelector(".reference-card__title");
    const urlInput = item.querySelector('input[type="text"]');
    const whyInput = item.querySelector("textarea");
    const removeButton = item.querySelector("[data-remove]");

    title.textContent = kind === "anti" ? `Антиреференс ${number}` : `Референс ${number}`;
    urlInput.name = kind === "anti" ? `antiReferenceUrl${number}` : `referenceUrl${number}`;

    if (whyInput) {
      whyInput.name = `referenceWhy${number}`;
    }

    if (removeButton) {
      removeButton.hidden = items.length === 1;
    }
  });
};

const createReferenceItem = (list, number) => {
  const kind = list.dataset.kind;
  const card = document.createElement("div");
  card.className = "reference-card";
  card.dataset.item = "";

  const whyField =
    kind === "anti"
      ? ""
      : `
        <label>
          Почему нравится
          <textarea name="referenceWhy${number}" rows="2" placeholder="Что именно цепляет"></textarea>
        </label>
      `;

  card.innerHTML = `
    <div class="reference-card__header">
      <h3 class="reference-card__title"></h3>
      <button type="button" class="ghost-button" data-remove>Удалить</button>
    </div>
    <label>
      ${kind === "anti" ? "Ссылка, изображение или название" : "Ссылка или название бренда"}
      <input
        name="${kind === "anti" ? `antiReferenceUrl${number}` : `referenceUrl${number}`}"
        type="text"
        placeholder="${kind === "anti" ? "Что точно не должно получиться" : "https://... или Apple, Nike"}"
      />
    </label>
    ${whyField}
  `;

  return card;
};

const handleAddItem = (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) {
    return;
  }

  const list = document.querySelector(`#${button.dataset.add}`);
  const maxItems = Number(list.dataset.max) || MAX_REFERENCE_ITEMS;
  const currentCount = list.querySelectorAll("[data-item]").length;

  if (currentCount >= maxItems) {
    formStatus.textContent = `Можно добавить не больше ${maxItems} элементов.`;
    return;
  }

  list.append(createReferenceItem(list, currentCount + 1));
  renameListItems(list);
};

const handleRemoveItem = (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) {
    return;
  }

  const list = button.closest("[data-kind]");
  button.closest("[data-item]")?.remove();
  renameListItems(list);
};

const handleEscapePress = (event) => {
  if (event.key !== ESCAPE_KEY) {
    return;
  }

  if (briefNav.classList.contains("is-expanded")) {
    briefNav.classList.remove("is-expanded");
  }

  closeAllTermTips();
};

const createTermElement = (text, tipText) => {
  const term = document.createElement("span");
  const tipButton = document.createElement("button");
  const tipIcon = document.createElement("span");
  const tipPopup = document.createElement("span");

  term.className = "term";
  tipButton.type = "button";
  tipButton.className = "term-tip";
  tipButton.setAttribute("aria-label", `Что такое ${text}`);
  tipButton.setAttribute("aria-expanded", "false");
  tipIcon.setAttribute("aria-hidden", "true");
  tipIcon.textContent = "?";
  tipPopup.className = "term-tip__popup";
  tipPopup.setAttribute("role", "tooltip");
  tipPopup.textContent = tipText;

  tipButton.append(tipIcon);
  term.append(document.createTextNode(text), tipButton, tipPopup);
  return term;
};

const wrapElementTextWithTip = (element, tipText) => {
  if (!element || element.querySelector(".term") || !tipText) {
    return;
  }

  const text = element.textContent.trim();
  if (!text) {
    return;
  }

  element.textContent = "";
  element.append(createTermElement(text, tipText));
};

const wrapChoiceOptionWithTip = (label, tipText) => {
  if (!label || label.querySelector(".term") || !tipText) {
    return;
  }

  const text = [...label.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return;
  }

  [...label.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .forEach((node) => node.remove());

  label.append(createTermElement(text, tipText));
};

const SECTION_TIPS = {
  "audience-title": "Для кого предназначен бренд: возраст, роль и контекст использования.",
  "positioning-title": "Как бренд должен восприниматься на рынке: премиальный, доступный, технологичный и т.д.",
  "personality-title": "Характер бренда, как будто это человек: спокойный, смелый, дружелюбный.",
  "logo-type-title": "Формат логотипа: только название, символ, сочетание или эмблема.",
  "symbolism-title": "Образы и знаки, которые можно или нельзя использовать в логотипе.",
  "typography-title": "Характер шрифта и языки, на которых должно читаться название.",
  "references-title": "Примеры логотипов, которые вам нравятся и задают направление.",
  "anti-references-title": "Примеры, которые точно не стоит повторять по стилю или ощущению.",
  "scalability-title": "Насколько важно, чтобы логотип хорошо читался в маленьком размере.",
  "architecture-title": "Как бренд и его продукты связаны: один логотип или система подбрендов.",
};

const CHOICE_TIPS = {
  "Wordmark — только название": "Логотип состоит только из названия, без отдельного знака.",
  "Lettermark — инициалы / буквы": "Логотип из инициалов или нескольких букв, например IBM или HP.",
  "Symbol — отдельный символ": "Отдельный графический знак, который может жить без названия.",
  "Combination — символ + название": "Связка знака и названия в одной композиции.",
  "Emblem — эмблема": "Название вписано внутрь формы: герб, печать или закрытый знак.",
  "Mascot — персонаж": "Логотип с персонажем или маскотом бренда.",
  "Abstract — абстрактный знак": "Небуквальный знак: геометрия или форма без прямого изображения.",
  "Не знаю — предложите варианты": "Можно не выбирать заранее — дизайнер предложит подходящие типы.",
  Minimal: "Максимально простой и чистый стиль без лишних деталей.",
  Modern: "Современный аккуратный стиль, близкий к актуальным digital-брендам.",
  Premium: "Сдержанный премиальный вид с ощущением качества.",
  Luxury: "Более статусный и «дорогой» визуальный язык.",
  Tech: "Технологичный стиль: точность, геометрия, digital-ощущение.",
  Corporate: "Корпоративный деловой стиль, понятный и строгий.",
  Editorial: "Стиль в духе журналов и издательской графики.",
  Geometric: "Основан на простых геометрических формах.",
  Organic: "Мягкие, природные, более живые формы.",
  Bold: "Смелый и заметный стиль с сильным акцентом.",
  Friendly: "Дружелюбный и тёплый визуальный тон.",
  Elegant: "Элегантный утончённый стиль.",
  Classic: "Классический проверенный вид без резких экспериментов.",
  Retro: "Ретро-отсылки и винтажные приёмы.",
  Futuristic: "Футуристичный, инновационный визуальный язык.",
  Handcrafted: "Ощущение ручной работы и ремесла.",
  Experimental: "Смелые нестандартные визуальные решения.",
  "E-commerce": "Онлайн-торговля: магазин или маркетплейс в интернете.",
  "IT / Software": "IT-продукты, сервисы и программное обеспечение.",
  Фавикон: "Маленькая иконка сайта на вкладке браузера и в закладках.",
};

const FIELD_TIPS = [
  {
    match: (label) => label.textContent.trim() === "Слоган",
    tip: "Короткая фраза бренда, которая передаёт суть или обещание.",
  },
  {
    match: (label) => label.textContent.includes("HEX / RGB / Pantone"),
    tip: "Точные коды цвета бренда: HEX (#B8862F), RGB или Pantone.",
  },
];

const FIELD_GROUP_TIPS = [
  {
    match: (title) => title.textContent.includes("отдельная иконка"),
    tip: "Отдельный знак для аватаров, приложений и маленьких форматов без полного названия.",
  },
];

const applyLogoTermTips = () => {
  Object.entries(SECTION_TIPS).forEach(([id, tipText]) => {
    wrapElementTextWithTip(document.getElementById(id), tipText);
  });

  document.querySelectorAll(".choice-option").forEach((option) => {
    const input = option.querySelector("input");
    wrapChoiceOptionWithTip(option, CHOICE_TIPS[input?.value]);
  });

  document.querySelectorAll("label").forEach((label) => {
    if (label.querySelector(".term")) {
      return;
    }

    const tip = FIELD_TIPS.find((item) => item.match(label));
    if (!tip) {
      return;
    }

    const textNodes = [...label.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
    const text = textNodes.map((node) => node.textContent).join("").replace(/\s+/g, " ").trim();

    if (!text) {
      return;
    }

    textNodes.forEach((node) => node.remove());
    const control = label.querySelector("input, select, textarea");
    label.insertBefore(createTermElement(text, tip.tip), control);
  });

  document.querySelectorAll(".field-group__title").forEach((title) => {
    const tip = FIELD_GROUP_TIPS.find((item) => item.match(title));
    if (tip) {
      wrapElementTextWithTip(title, tip.tip);
    }
  });
};

const closeAllTermTips = () => {
  document.querySelectorAll(".term.is-open").forEach((term) => {
    term.classList.remove("is-open");
    term.querySelector(".term-tip")?.setAttribute("aria-expanded", "false");
  });
};

const handleTermTipClick = (event) => {
  const tipButton = event.target.closest(".term-tip");

  if (!tipButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const term = tipButton.closest(".term");
  const willOpen = !term.classList.contains("is-open");

  closeAllTermTips();
  term.classList.toggle("is-open", willOpen);
  tipButton.setAttribute("aria-expanded", String(willOpen));
};

const closeTermTipsOnOutsideClick = (event) => {
  if (!event.target.closest(".term")) {
    closeAllTermTips();
  }
};

briefForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "";
  resultStatus.textContent = "";
  setSubmitState(true);

  try {
    const answers = buildAnswers();
    const summary = buildSummary(answers);
    const prompt = buildPrompt(answers);
    const fields = getBriefFields();
    let sendError = "";

    latestPrompt = prompt;
    latestBriefText = buildDownloadText(answers, summary, prompt);

    try {
      await sendBrief({ fields, prompt });
    } catch (error) {
      sendError = error.message;
    }

    renderSummary(summary);
    promptBox.textContent = prompt;
    resultStatus.textContent = sendError
      ? `${sendError} Промпт всё равно готов — скопируйте или скачайте бриф.`
      : "";
    showResultScreen();
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    setSubmitState(false);
  }
});

briefForm.addEventListener("change", (event) => {
  enforceCheckboxLimit(event);
  syncConditionalFields();
});

document.addEventListener("click", handleAddItem);
document.addEventListener("click", handleRemoveItem);
document.addEventListener("click", handleTermTipClick);
document.addEventListener("click", closeTermTipsOnOutsideClick);
document.querySelector("#copy-prompt").addEventListener("click", copyPrompt);
document.querySelector("#download-brief").addEventListener("click", downloadBrief);
document.querySelector("#edit-brief").addEventListener("click", showBriefForm);
document.querySelector("#new-brief").addEventListener("click", resetBrief);
briefNav.addEventListener("click", handleNavClick);
document.addEventListener("click", closeNavOnOutsideClick);
document.addEventListener("keydown", handleEscapePress);
window.addEventListener("scroll", updateNavVisibility, { passive: true });
window.addEventListener("scroll", updateActiveSection, { passive: true });

applyLogoTermTips();
syncConditionalFields();
updateActiveSection();
updateNavVisibility();
