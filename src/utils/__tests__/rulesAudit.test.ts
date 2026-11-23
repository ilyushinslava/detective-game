import { describe, it, expect } from "vitest";
import { MODES_DATA } from "../../components/rules/rulesData";

describe("Rules and Handbook Audit (Блок 1 Справочник)", () => {
  it("гарантирует отсутствие режима LINE_UP (Очная ставка) в структуре справочника", () => {
    const keys = Object.keys(MODES_DATA);
    expect(keys).toContain("BASE");
    expect(keys).toContain("MANIAC");
    expect(keys).toContain("THIEF");
    expect(keys).toContain("SECRET_SERVICE");
    expect(keys).not.toContain("LINE_UP");
    expect((MODES_DATA as any).LINE_UP).toBeUndefined();
  });

  it("проверяет корректность правил режима Почерк убийцы (MANIAC): 4 жертвы, арест, радиус 3x3", () => {
    const maniac = MODES_DATA.MANIAC;
    expect(maniac.title).toMatch(/почерк убийцы/i);
    expect(maniac.role1.name).toBe("Убийца");
    expect(maniac.role2.name).toBe("Сыщик");
    expect(maniac.role1.goal).toContain("4");
    expect(maniac.role2.goal).toMatch(/задержать|арест/i);

    const mechanicsText = maniac.mechanics.map((m) => `${m.name} ${m.desc}`).join(" ");
    expect(mechanicsText).toMatch(/3×3|3x3/);
    expect(mechanicsText).toMatch(/жертв/);
  });

  it("проверяет корректность правил режима Оцепление (THIEF): 8 краж, патрули", () => {
    const thief = MODES_DATA.THIEF;
    expect(thief.title).toMatch(/оцепление/i);
    expect(thief.role1.name).toBe("Грабитель");
    expect(thief.role2.name).toBe("Полиция");
    expect(thief.role1.goal).toContain("8");
    expect(thief.role2.goal).toMatch(/патрул|арест/i);

    const mechanicsText = thief.mechanics.map((m) => `${m.name} ${m.desc}`).join(" ");
    expect(mechanicsText).toMatch(/8 краж|похитить 8/i);
    expect(mechanicsText).toMatch(/патрул/i);
  });

  it("проверяет корректность правил режима Директива «Ноль» (SECRET_SERVICE): единый термин компромат", () => {
    const secret = MODES_DATA.SECRET_SERVICE;
    expect(secret.title).toMatch(/директива «ноль»/i);
    expect(secret.role1.goal).toMatch(/компромат/i);
    expect(secret.role2.goal).toMatch(/компромат/i);

    const mechanicsText = secret.mechanics.map((m) => `${m.name} ${m.desc}`).join(" ");
    expect(mechanicsText).toMatch(/компромат/i);
    expect(mechanicsText).toMatch(/допрос|разоблачение/i);
  });
});
