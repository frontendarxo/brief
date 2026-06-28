const briefForm = document.querySelector("#brief-form");
const successMessage = document.querySelector("#success-message");
const editBriefButton = document.querySelector("#edit-brief");
const submitButton = document.querySelector("#submit-button");
const formStatus = document.querySelector("#form-status");

const getLabelText = (field) => {
  const label = field.closest("label");
  const textNodes = [...label.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);

  return textNodes.map((node) => node.textContent.trim()).filter(Boolean).join(" ");
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
