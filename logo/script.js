const BRIEF_TYPE = "logo";
const NAV_VISIBILITY_OFFSET = 80;
const SECTION_FOCUS_OFFSET = 140;
const ESCAPE_KEY = "Escape";
const EMPTY_VALUE = "не указано";
const MAX_REFERENCE_ITEMS = 5;

const briefForm = document.querySelector("#brief-form");
const successMessage = document.querySelector("#success-message");
const successCard = successMessage.querySelector(".success-message__card");
const briefReview = document.querySelector("#brief-review");
const summaryBlock = document.querySelector("#summary-block");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");
const briefNav = document.querySelector(".brief-nav");
const heroSection = document.querySelector(".hero");
const navLinks = [...document.querySelectorAll(".brief-nav__link")];
const formSections = [...document.querySelectorAll(".form-section[id]")];
const canHover = window.matchMedia("(hover: hover)").matches;

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

const formatLine = (label, value) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? `${label}: ${text}` : null;
};

const formatList = (values) => values.filter(Boolean).join("; ");

const buildPromptContext = (answers) => {
  const business = formatList([
    answers.businessCategories,
    answers.businessDescription,
    answers.mainProduct && `main product: ${answers.mainProduct}`,
    answers.keyProducts && `key offerings: ${answers.keyProducts}`,
    answers.heroProduct && `hero product: ${answers.heroProduct}`,
  ]);

  const audience = formatList([
    answers.audienceGroups,
    answers.audienceAge && `age: ${answers.audienceAge}`,
    answers.geography,
    answers.regions && `regions: ${answers.regions}`,
  ]);

  const visual = formatList([
    answers.visualStyle,
    answers.minimalismLevel && `minimalism level ${answers.minimalismLevel}/5 (1=simplest, 5=more expressive)`,
  ]);

  const colors = formatList([
    answers.likedColors && `preferred: ${answers.likedColors}`,
    answers.brandColors && `exact brand colors: ${answers.brandColors}`,
    answers.forbiddenColors && `forbidden: ${answers.forbiddenColors}`,
  ]);

  const typography = formatList([
    answers.typographyStyle,
    answers.languages && `required languages: ${answers.languages}`,
    answers.needsArabic && `Arabic version: ${answers.needsArabic}`,
  ]);

  const symbolism = formatList([
    answers.desiredSymbol && `requested symbol: ${answers.desiredSymbol}`,
    answers.symbolIdeas && `ideas/metaphors: ${answers.symbolIdeas}`,
    answers.forbiddenSymbols && `forbidden symbols: ${answers.forbiddenSymbols}`,
  ]);

  const avoid = formatList([
    answers.antiReferences.length && `anti-references: ${answers.antiReferences.join("; ")}`,
    answers.antiReferenceWhy && `why dislike: ${answers.antiReferenceWhy}`,
    answers.designerRestrictions && `designer restrictions: ${answers.designerRestrictions}`,
    answers.legalConstraints && `legal/cultural/religious constraints: ${answers.legalConstraints}`,
  ]);

  const architecture = formatList([
    answers.subbrands && `sub-brands/directions: ${answers.subbrands}`,
    answers.brandGrowth && `growth plan: ${answers.brandGrowth}`,
    answers.competitors.length && `competitors: ${answers.competitors.join(", ")}`,
    answers.differentiate && `differentiate from competitors: ${answers.differentiate}`,
    answers.differentiateHow && `how to differentiate: ${answers.differentiateHow}`,
  ]);

  const scalability = formatList([
    answers.smallSizeImportance && `small-size performance: ${answers.smallSizeImportance}`,
    answers.needsIcon && `standalone icon/mark needed: ${answers.needsIcon}`,
  ]);

  const feeling = formatList([
    answers.desiredFeeling,
    answers.idealLogoSentence && `ideal logo in one sentence: "${answers.idealLogoSentence}"`,
  ]);

  return [
    formatLine("Brand name", answers.brandName),
    formatLine("Alternative naming / scripts", answers.brandNameAlt),
    formatLine("Slogan", answers.slogan),
    formatLine("Business", business),
    formatLine("Target audience", audience),
    formatLine("Brand positioning", answers.positioning),
    formatLine("Brand personality", answers.personality),
    formatLine("Visual direction", visual),
    formatLine("Preferred logo types", answers.logoTypes),
    formatLine("Symbolism", symbolism),
    formatLine("Color system inputs", colors),
    formatLine("Typography inputs", typography),
    formatLine("References to learn from", answers.references.join("; ")),
    formatLine("What to avoid", avoid),
    formatLine("Primary applications / media", answers.usage),
    formatLine("Scalability", scalability),
    formatLine("Brand architecture", architecture),
    formatLine("Brand specifics", answers.brandFeatures),
    formatLine("Priorities", answers.priorities),
    formatLine("Desired perception / emotion", feeling),
    formatLine("Additional notes", answers.extraInfo),
  ].filter(Boolean);
};

const buildPrompt = (answers) => {
  const brandName = valueOrFallback(answers.brandName);
  const contextLines = buildPromptContext(answers);
  const usageSurfaces = answers.usage || "website, Instagram, packaging, business cards, documents, ads";

  return [
    "ROLE",
    "You are a senior brand designer and art director specializing in brand books and identity systems.",
    "Your task is to create a complete professional BRAND BOOK (brand guidelines) with concrete application designs.",
    "Do NOT stop at a logo concept. Explain exactly how the brand looks on real media.",
    "",
    "PRIMARY GOAL",
    `Build a full visual identity system and brand book for «${brandName}».`,
    "The brand book must be practical, coherent, and ready for designers, marketers, and production.",
    "",
    "INPUT BRIEF (from client)",
    ...contextLines,
    "",
    "REQUIRED BRAND BOOK STRUCTURE",
    "Produce the brand book in this exact order:",
    "",
    "1. Brand Overview",
    "- Brand name, meaning, and short positioning statement",
    "- Mission / essence in 1–2 sentences",
    "- Audience and market context",
    "",
    "2. Brand Strategy Foundation",
    "- Positioning",
    "- Personality traits",
    "- Tone of voice",
    "- Key messages and promise",
    "",
    "3. Full Logo System (mandatory detail)",
    "- FULL LOGO (primary lockup): symbol + wordmark together, or full wordmark if no symbol",
    "  Describe composition, proportions, spacing between mark and name, slogan placement if any",
    "- LOGO MARK / ICON: standalone symbol for small sizes",
    "- WORDMARK ONLY: text version without symbol",
    "- HORIZONTAL and STACKED layouts",
    "- MONOCHROME / single-color and REVERSE (on dark) versions",
    "- Clear space, minimum size, alignment grid",
    "- Incorrect usage: no stretch, no random recolor, no shadows/effects, no low contrast",
    "",
    "4. Instagram / Social Avatar Logo (mandatory)",
    "- Design the INSTAGRAM PROFILE LOGO (square avatar, typically 1:1)",
    "- Prefer the mark/icon centered; if lettermark, make it instantly readable at tiny size",
    "- Specify safe margins inside the circle crop Instagram uses",
    "- Colors for avatar on light and dark app themes",
    "- Also define Instagram highlight covers style and feed post logo placement (corner watermark rules)",
    "- Define LinkedIn / Telegram / TikTok avatar adaptations if relevant",
    "",
    "5. Color System",
    "- Primary palette with HEX / RGB / CMYK",
    "- Secondary and neutrals",
    "- Roles: background, accent, text, UI, print",
    "- Contrast / accessibility notes",
    "- Forbidden combinations",
    "",
    "6. Typography System",
    "- Primary and secondary typefaces",
    "- Hierarchy: H1–H3, body, caption, buttons",
    "- Language support from the brief",
    "- Arabic / multilingual rules if requested",
    "",
    "7. Graphic Language & Symbolism",
    "- Core metaphor / symbol meaning",
    "- Patterns, motifs, photo/illustration style",
    "- Allowed vs forbidden visual ideas",
    "",
    "8. Application Designs (mandatory — describe each as a real mockup)",
    `Surfaces from brief: ${usageSurfaces}`,
    "For EVERY application below, describe layout, logo version used, colors, typography, margins, and production notes:",
    "",
    "8.1 Business card (визитка)",
    "- Front and back layout",
    "- Which logo version (full logo vs mark)",
    "- Name, role, phone, email, site, socials placement",
    "- Paper feel / finish recommendations (matte, soft-touch, spot UV, etc.) if useful",
    "- Portrait or landscape, safe zones, QR if relevant",
    "",
    "8.2 Packaging (пакет / упаковка)",
    "- Shopping bag / package outer face design",
    "- Where the full logo sits, scale, and breathing space",
    "- Side / bottom / handle treatments",
    "- Pattern or graphic language on packaging",
    "- Colorway for kraft / white / branded materials",
    "- How the brand looks when the package is closed and when opened",
    "",
    "8.3 Instagram presence",
    "- Profile avatar (as above)",
    "- Profile header / bio visual logic",
    "- Post template: where full logo or mark appears",
    "- Story template and highlight icons",
    "- Consistency between avatar (icon) and posts (full logo)",
    "",
    "8.4 Website / app header",
    "- Full logo in header, favicon = mark",
    "- Mobile vs desktop logo behavior",
    "",
    "8.5 Additional surfaces from the brief",
    "- Signage / вывеска",
    "- Documents / letterhead / PDF",
    "- Merch / clothing",
    "- Ads / banners",
    "- Favicon",
    "Only expand surfaces that match the brief; still always include business card, packaging, Instagram, and full logo.",
    "",
    "9. Brand Architecture (if relevant)",
    "- Master brand vs products / sub-brands / ecosystem",
    "",
    "10. Competitive Differentiation",
    "- How identity stands apart from listed competitors",
    "",
    "11. Concept Directions + Recommendation",
    "- 3–5 distinct identity directions",
    "- For each: full logo sketch description + Instagram avatar + one application example",
    "- Recommend the strongest direction and why it fits priorities",
    "",
    "OUTPUT QUALITY RULES",
    "- Think like a brand-book author and production designer.",
    "- Be concrete: sizes, placement, color codes, logo version per surface.",
    "- Always distinguish FULL LOGO vs INSTAGRAM AVATAR / ICON — they are different assets.",
    "- Always explain how the business card and packaging should look, not only that they 'use the logo'.",
    "- Prefer distinctive, original solutions over generic AI logo clichés.",
    "- Do not copy reference brands; extract principles only.",
    "- Respect all restrictions and cultural/legal constraints.",
    "- If brief fields are missing, make professional assumptions and label them as assumptions.",
    "",
    "SUCCESS CRITERIA",
    `After reading your brand book, a designer can produce for «${brandName}»:`,
    "1) the full primary logo",
    "2) the Instagram avatar logo",
    "3) a print-ready business card",
    "4) a branded package / shopping bag",
    "without guessing layout, logo version, or colors.",
    "The result must feel like a premium, production-ready brand guidelines document.",
  ].join("\n");
};

const buildUserReview = (answers) => {
  const rows = [
    ["Название бренда", answers.brandName],
    ["Дополнительное написание", answers.brandNameAlt],
    ["Слоган", answers.slogan],
    ["Категории бизнеса", answers.businessCategories],
    ["Описание бизнеса", answers.businessDescription],
    ["Основной продукт", answers.mainProduct],
    ["Ключевые продукты", answers.keyProducts],
    ["Главный продукт", answers.heroProduct],
    ["Аудитория", answers.audienceGroups],
    ["Возраст", answers.audienceAge],
    ["География", answers.geography],
    ["Страны / регионы", answers.regions],
    ["Позиционирование", answers.positioning],
    ["Характер бренда", answers.personality],
    ["Визуальный стиль", answers.visualStyle],
    ["Минимализм", answers.minimalismLevel && `${answers.minimalismLevel}/5`],
    ["Тип логотипа", answers.logoTypes],
    ["Символ", answers.desiredSymbol],
    ["Образы и идеи", answers.symbolIdeas],
    ["Запрещённые символы", answers.forbiddenSymbols],
    ["Цвета", answers.likedColors],
    ["Цвета бренда", answers.brandColors],
    ["Запрещённые цвета", answers.forbiddenColors],
    ["Типографика", answers.typographyStyle],
    ["Арабская версия", answers.needsArabic],
    ["Языки", answers.languages],
    ["Референсы", answers.references.join("\n")],
    ["Антиреференсы", answers.antiReferences.join("\n")],
    ["Что не нравится в антиреференсах", answers.antiReferenceWhy],
    ["Конкуренты", answers.competitors.join(", ")],
    ["Отличие от конкурентов", answers.differentiateHow],
    ["Особенности бренда", answers.brandFeatures],
    ["Где используется", answers.usage],
    ["Маленький размер", answers.smallSizeImportance],
    ["Отдельная иконка", answers.needsIcon],
    ["Дочерние направления", answers.subbrands],
    ["Развитие бренда", answers.brandGrowth],
    ["Ограничения для дизайнера", answers.designerRestrictions],
    ["Юридические / культурные ограничения", answers.legalConstraints],
    ["Желаемое ощущение", answers.desiredFeeling],
    ["Идеальный логотип", answers.idealLogoSentence],
    ["Приоритеты", answers.priorities],
    ["Дополнительно", answers.extraInfo],
    ["Контакт", answers.contactName],
    ["Связь", answers.contactInfo],
  ];

  return rows
    .filter(([, value]) => Boolean(value))
    .map(([title, text]) => ({ title, text }));
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

const showSuccessMessage = () => {
  briefReview.hidden = true;
  briefReview.classList.remove("is-visible");
  successMessage.hidden = false;
  document.body.classList.add("has-modal");
  document.querySelector("#view-brief").focus();
};

const hideSuccessMessage = () => {
  successMessage.hidden = true;
  document.body.classList.remove("has-modal");
};

const showBriefReview = () => {
  hideSuccessMessage();
  briefForm.classList.add("is-hidden");
  briefNav.classList.remove("is-visible", "is-expanded");
  briefReview.hidden = false;
  briefReview.classList.add("is-visible");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const showBriefForm = () => {
  hideSuccessMessage();
  briefReview.hidden = true;
  briefReview.classList.remove("is-visible");
  briefForm.classList.remove("is-hidden");
  updateNavVisibility();
  updateActiveSection();
  submitButton.focus();
};

const handleSuccessMessageClick = (event) => {
  if (!successCard.contains(event.target)) {
    showBriefForm();
  }
};

const setSubmitState = (isLoading) => {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Отправляем..." : "Отправить бриф";
};

const getSendErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.error || "Не удалось отправить бриф. Попробуйте ещё раз.";
  } catch (error) {
    return "Не удалось отправить бриф. Попробуйте ещё раз.";
  }
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

  if (!successMessage.hidden) {
    showBriefForm();
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
  setSubmitState(true);

  try {
    const answers = buildAnswers();
    const prompt = buildPrompt(answers);
    const fields = getBriefFields();

    await sendBrief({ fields, prompt });
    renderSummary(buildUserReview(answers));
    showSuccessMessage();
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
document.querySelector("#view-brief").addEventListener("click", showBriefReview);
document.querySelector("#send-again").addEventListener("click", showBriefForm);
document.querySelector("#back-to-success").addEventListener("click", showSuccessMessage);
document.querySelector("#edit-from-review").addEventListener("click", showBriefForm);
successMessage.addEventListener("click", handleSuccessMessageClick);
briefNav.addEventListener("click", handleNavClick);
document.addEventListener("click", closeNavOnOutsideClick);
document.addEventListener("keydown", handleEscapePress);
window.addEventListener("scroll", updateNavVisibility, { passive: true });
window.addEventListener("scroll", updateActiveSection, { passive: true });

applyLogoTermTips();
syncConditionalFields();
updateActiveSection();
updateNavVisibility();
