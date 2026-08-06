const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

const oldBlock = `  const rubricColumns = detections
    .filter((item) => item.role === "Rubrique")
    .map((item) => item.header);`;

const newBlock = `  const rubricColumns = useMemo(
    () =>
      detections
        .filter((item) => item.role === "Rubrique")
        .map((item) => item.header),
    [detections]
  );`;

if (!source.includes(oldBlock)) {
  throw new Error("Bloc rubricColumns introuvable.");
}

source = source.replace(oldBlock, newBlock);

const oldMemberEffect = `  useEffect(() => {
    const next: Record<string, MemberDecision> = {};

    for (const item of memberMatches) {
      next[item.source] = {
        mode: "associate",
        membreId: item.target?.id ?? "",
      };
    }

    setMemberDecisions(next);
  }, [memberMatches]);`;

const newMemberEffect = `  useEffect(() => {
    setMemberDecisions((current) => {
      const next: Record<string, MemberDecision> = {};

      for (const item of memberMatches) {
        next[item.source] =
          current[item.source] ?? {
            mode: "associate",
            membreId: item.target?.id ?? "",
          };
      }

      return next;
    });
  }, [memberMatches]);`;

if (!source.includes(oldMemberEffect)) {
  throw new Error("Bloc useEffect membres introuvable.");
}

source = source.replace(oldMemberEffect, newMemberEffect);

const oldRubricEffect = `  useEffect(() => {
    const next: Record<string, RubricDecision> = {};

    for (const item of rubricMatches) {
      next[item.source] = item.target
        ? {
            mode: "associate",
            rubriqueId: item.target.id,
          }
        : {
            mode: "create",
            rubriqueId: "",
          };
    }

    setRubricDecisions(next);
  }, [rubricMatches]);`;

const newRubricEffect = `  useEffect(() => {
    setRubricDecisions((current) => {
      const next: Record<string, RubricDecision> = {};

      for (const item of rubricMatches) {
        next[item.source] =
          current[item.source] ??
          (item.target
            ? {
                mode: "associate",
                rubriqueId: item.target.id,
              }
            : {
                mode: "create",
                rubriqueId: "",
              });
      }

      return next;
    });
  }, [rubricMatches]);`;

if (!source.includes(oldRubricEffect)) {
  throw new Error("Bloc useEffect rubriques introuvable.");
}

source = source.replace(oldRubricEffect, newRubricEffect);

fs.writeFileSync(pagePath, source, "utf8");
console.log("Correction appliquée : les sélections manuelles sont maintenant conservées.");