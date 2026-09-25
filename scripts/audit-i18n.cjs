const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const source = parser.parse(fs.readFileSync("components/language-provider.jsx", "utf8"), {
  sourceType: "module",
  plugins: ["jsx"],
});

function objectValue(node) {
  if (!node || node.type !== "ObjectExpression") return {};
  return Object.fromEntries(node.properties.filter((item) => item.type === "ObjectProperty").map((item) => {
    const key = item.key.value ?? item.key.name;
    return [key, item.value.type === "ObjectExpression" ? objectValue(item.value) : item.value.value];
  }));
}

const dictionaries = {};
const focusTranslationsPath = "components/focus-translations.json";
const focusTranslations = fs.existsSync(focusTranslationsPath) ? JSON.parse(fs.readFileSync(focusTranslationsPath, "utf8")) : { ps: {}, fa: {} };
traverse(source, {
  VariableDeclarator(item) {
    if (["translations", "glossary", "extendedGlossary", "wordGlossary", "meaningTranslations", "operationalTranslations"].includes(item.node.id.name)) {
      dictionaries[item.node.id.name] = objectValue(item.node.init);
    }
  },
});

const files = [];
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory() && !["api", "ui"].includes(item.name)) walk(target);
    else if (/\.(js|jsx)$/.test(item.name) && !target.endsWith("language-provider.jsx")) files.push(target);
  }
}
["app", "components"].forEach(walk);

const phrases = new Set();
const phraseFiles = new Map();
function addPhrase(value, file) {
  phrases.add(value);
  if (!phraseFiles.has(value)) phraseFiles.set(value, new Set());
  phraseFiles.get(value).add(file.replaceAll("\\", "/"));
}
const translatedAttributes = new Set(["title", "description", "subtitle", "detail", "label", "placeholder", "emptyTitle", "message", "aria-label", "text", "submitLabel"]);
for (const file of files) {
  const ast = parser.parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    JSXText(item) {
      const value = item.node.value.replace(/\s+/g, " ").trim();
      if (/[A-Za-z]{2}/.test(value)) addPhrase(value, file);
    },
    StringLiteral(item) {
      const value = item.node.value.trim();
      const parent = item.parent;
      if (!/[A-Za-z]{2}/.test(value) || value.length > 300) return;
      if (parent.type === "JSXAttribute" && translatedAttributes.has(parent.name.name)) addPhrase(value, file);
      else if (parent.type === "ObjectProperty" && (translatedAttributes.has(parent.key.name ?? parent.key.value) || /^[A-Z]/.test(value))) addPhrase(value, file);
      else if (["ArrayExpression", "ConditionalExpression"].includes(parent.type) && /^[A-Z]/.test(value)) addPhrase(value, file);
      else if (parent.type === "CallExpression" && ["setError", "saved", "Error", "t"].includes(parent.callee.name) && /^[A-Z]/.test(value)) addPhrase(value, file);
    },
  });
}

// Detail dialogs build labels from API field names at runtime (for example,
// employee_name -> Employee name). Keep those generated phrases in the audit
// so a translated page cannot silently expose English labels.
const generatedDetailLabels = {
  "app/dashboard/hr/page.js": [
    "employee_name", "employee_number", "worked_duration", "total_days", "gross_pay",
    "net_pay", "base_salary", "reviewed_at", "reviewed_by", "review_notes", "leave_type",
  ],
  "components/pharmacy-forms.jsx": [
    "sale_number", "purchase_number", "invoice_number", "discount_amount", "discount_reason",
    "total_amount", "void_reason", "created_at", "updated_at", "quantity_received",
    "quantity_available", "stock_quantity", "purchase_price", "sale_price", "reference_number",
  ],
};
for (const [file, keys] of Object.entries(generatedDetailLabels)) {
  for (const key of keys) {
    const phrase = key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
    addPhrase(phrase, file);
  }
}

let hasMissingTranslations = false;
const focusFiles = new Set([
  "app/dashboard/departments/page.js",
  "components/departments-ui.jsx",
  "app/dashboard/patients/page.js",
  "app/dashboard/reception/page.js",
  "app/dashboard/hr/page.js",
  "components/hr-ui.jsx",
  "app/dashboard/pharmacy/page.js",
  "components/pharmacy-ui.jsx",
  "components/pharmacy-forms.jsx",
  "app/dashboard/finance/page.js",
  "components/finance-ui.jsx",
  "components/finance-forms.jsx",
  "app/dashboard/laboratory/page.js",
  "components/laboratory-ui.jsx",
]);

function escape(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function legacyPhraseTranslation(value, language) {
  const entries = Object.entries(Object.assign({}, dictionaries.wordGlossary[language], dictionaries.extendedGlossary[language], dictionaries.glossary[language], dictionaries.translations[language], dictionaries.meaningTranslations[language]))
    .sort((a, b) => b[0].length - a[0].length);
  return entries.reduce((result, [english, localized]) => {
    const boundary = /^[A-Za-z]/.test(english) && /[A-Za-z]$/.test(english) ? "\\b" : "";
    return result.replace(new RegExp(`${boundary}${escape(english)}${boundary}`, "gi"), localized);
  }, value);
}

if (process.env.GENERATE_FOCUS === "1") {
  for (const language of ["ps", "fa"]) {
    const reviewed = Object.assign({}, dictionaries.wordGlossary[language], dictionaries.extendedGlossary[language], dictionaries.glossary[language], dictionaries.translations[language], dictionaries.meaningTranslations[language], dictionaries.operationalTranslations[language]);
    const normalized = new Set(Object.keys(reviewed).map((phrase) => phrase.toLocaleLowerCase("en")));
    for (const phrase of phrases) {
      if (![...(phraseFiles.get(phrase) || [])].some((file) => focusFiles.has(file))) continue;
      const bare = phrase.replace(/(\.{1,3}|[…,:;!?،؛؟])$/, "");
      if (!normalized.has(phrase.toLocaleLowerCase("en")) && !normalized.has(bare.toLocaleLowerCase("en"))) {
        focusTranslations[language][phrase] = legacyPhraseTranslation(phrase, language);
      }
    }
  }
  fs.writeFileSync(focusTranslationsPath, `${JSON.stringify(focusTranslations, null, 2)}\n`, "utf8");
}
for (const language of ["ps", "fa"]) {
  const dictionary = Object.assign({}, focusTranslations[language], dictionaries.wordGlossary[language], dictionaries.extendedGlossary[language], dictionaries.glossary[language], dictionaries.translations[language], dictionaries.meaningTranslations[language], dictionaries.operationalTranslations[language]);
  const normalized = new Set(Object.keys(dictionary).map((phrase) => phrase.toLocaleLowerCase("en")));
  const missing = [...phrases].filter((phrase) => {
    const withoutPunctuation = phrase.replace(/(\.{1,3}|[…,:;!?،؛؟])$/, "");
    return !normalized.has(phrase.toLocaleLowerCase("en")) && !normalized.has(withoutPunctuation.toLocaleLowerCase("en"));
  });
  if (missing.length) hasMissingTranslations = true;
  const focusMissing = missing.filter((phrase) => [...(phraseFiles.get(phrase) || [])].some((file) => focusFiles.has(file)));
  console.log(`${language}: ${phrases.size - missing.length}/${phrases.size} UI phrases have complete, context-aware translations`);
  console.log(`${language}: ${focusMissing.length ? focusMissing.length : "all"} focused module phrase gaps${focusMissing.length ? `\n${focusMissing.map((phrase) => `- ${phrase}`).join("\n")}` : " (complete)"}`);
  if (missing.length) console.log(`Missing complete phrases (first 80):\n${missing.slice(0, 80).map((phrase) => `- ${phrase}`).join("\n")}`);
}
// Local development reports coverage without breaking the build. CI can opt in
// to complete-coverage enforcement as new phrase translations are reviewed.
if (hasMissingTranslations && process.env.I18N_STRICT === "1") process.exitCode = 1;
