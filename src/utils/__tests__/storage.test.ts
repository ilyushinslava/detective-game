// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { storage } from "../storage";

describe("StorageService (IndexedDB + LocalStorage Hybrid)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Синхронный слой (LocalStorage Fallback)", () => {
    it("getSyncItem возвращает fallbackValue при отсутствии ключа", () => {
      const res = storage.getSyncItem("non_existing_key", { count: 42 });
      expect(res).toEqual({ count: 42 });
    });

    it("getSyncItem парсит валидный JSON из localStorage", () => {
      window.localStorage.setItem("test_sync_key", JSON.stringify({ score: 100 }));
      const res = storage.getSyncItem("test_sync_key", { score: 0 });
      expect(res).toEqual({ score: 100 });
    });

    it("getSyncItem возвращает fallbackValue при поврежденном JSON", () => {
      window.localStorage.setItem("corrupted_key", "{invalid_json:");
      const res = storage.getSyncItem("corrupted_key", "default_val");
      expect(res).toBe("default_val");
    });

    it("setSyncAndPersist сохраняет значение синхронно в localStorage", () => {
      storage.setSyncAndPersist("sync_save_key", { name: "Agent" });
      const raw = window.localStorage.getItem("sync_save_key");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual({ name: "Agent" });
    });

    it("setSyncAndPersist безопасно перехватывает сбой localStorage.setItem (например, QuotaExceeded)", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => {
        storage.setSyncAndPersist("quota_key", { big: "data" });
      }).not.toThrow();
    });
  });

  describe("Асинхронный слой (getItem / setItem / removeItem)", () => {
    it("setItem и getItem корректно работают с fallback на localStorage при отсутствии IDB", async () => {
      await storage.setItem("async_key", { role: "DETECTIVE", coins: 50 });
      const val = await storage.getItem("async_key", null);
      expect(val).toEqual({ role: "DETECTIVE", coins: 50 });
    });

    it("removeItem удаляет значение из хранилища", async () => {
      await storage.setItem("to_delete", "val_123");
      await storage.removeItem("to_delete");
      const val = await storage.getItem("to_delete", "default");
      expect(val).toBe("default");
    });

    it("getItem возвращает fallbackValue если данных нет", async () => {
      const val = await storage.getItem("never_set", 999);
      expect(val).toBe(999);
    });
  });

  describe("Обработка крайних случаев окружения", () => {
    it("getSyncItem не падает, если localStorage выбросит исключение при обращении", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError: Access is denied");
      });

      const res = storage.getSyncItem("restricted_key", "safe_fallback");
      expect(res).toBe("safe_fallback");
    });

    it("removeItem безопасно отрабатывает при сбое localStorage.removeItem", async () => {
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });

      await expect(storage.removeItem("some_key")).resolves.not.toThrow();
    });
  });
});
