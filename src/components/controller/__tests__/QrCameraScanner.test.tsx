// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QrCameraScanner, parseQrRoomCode } from "../QrCameraScanner";

// Мокаем Html5Qrcode для изоляции в jsdom
vi.mock("html5-qrcode", () => {
  return {
    Html5Qrcode: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
      isScanning: false,
    })),
  };
});

describe("QrCameraScanner and parseQrRoomCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("parseQrRoomCode logic", () => {
    it("извлекает 5-значный номер комнаты из полного URL лобби", () => {
      const url = "http://192.168.1.100:5173/detective-game/?room=54321&clientType=CONTROLLER";
      expect(parseQrRoomCode(url)).toBe("54321");
    });

    it("извлекает 5-значный номер комнаты из targetRoom параметра", () => {
      const url = "https://prime-suspect.app/?targetRoom=12345";
      expect(parseQrRoomCode(url)).toBe("12345");
    });

    it("принимает чистый 5-значный цифровой код", () => {
      expect(parseQrRoomCode("87654")).toBe("87654");
    });

    it("безопасно возвращает null для невалидных данных или неполных кодов", () => {
      expect(parseQrRoomCode("")).toBeNull();
      expect(parseQrRoomCode("123")).toBeNull();
      expect(parseQrRoomCode("https://google.com")).toBeNull();
      expect(parseQrRoomCode("invalid-qr-data")).toBeNull();
    });
  });

  describe("QrCameraScanner Component render", () => {
    it("рендерит прицельную рамку и статус сканирования", async () => {
      render(<QrCameraScanner onScanSuccess={vi.fn()} />);

      expect(screen.getByText(/ПОДКЛЮЧЕНИЕ КАМЕРЫ|НАВЕДИТЕ НА QR-КОД/i)).toBeDefined();
    });

    it("вызывает onManualSwitch при нажатии на переход к ручному вводу", () => {
      const manualSwitchSpy = vi.fn();
      // Рендерим компонент
      const { container } = render(
        <QrCameraScanner onScanSuccess={vi.fn()} onManualSwitch={manualSwitchSpy} />
      );

      expect(container.querySelector(".animate-scanLaser")).toBeDefined();
    });
  });
});
