# DESIGN.md — hệ thống thị giác đã chốt (thiep-20-11)

Tóm tắt hệ thống thị giác của thiệp 20/11: sản phẩm tĩnh một trang, HTML/CSS/JS thuần, không phụ thuộc, không backend. Chi tiết đầy đủ ở `docs/thiep-20-11/design.md`; hợp đồng kỹ thuật ở `docs/thiep-20-11/spec.md`.

## Thế giới thị giác

Giấy dó thủ công ấm: nền kem có hạt giấy, ánh sáng ấm chiếu từ trên-trái, bóng đổ lệch + mờ mềm. Không phẳng, không neon, không gradient chữ. Một thứ duy nhất để người dùng làm: bóc con dấu sáp đỏ trên phong bì giấy dó.

**Luận đề chuyển động:** một chuỗi hành vi có tác giả — bóc sáp → mở nắp → rút thư → an vị — lặp lại do người dùng chủ động, không tự chạy. Cánh hoa là vòng lặp duy nhất; dừng khi đóng, khi `stop()`, và không tồn tại dưới reduced motion.

**Luận đề cảm xúc:** người dùng phải thấy mình đang mở một tấm thiệp thật — đến từ vật liệu (hạt giấy, sáp nổi, thư trượt ra), không đến từ hiệu ứng trang trí.

## Token (nguồn duy nhất: `styles.css :root`)

| Nhóm | Giá trị |
|---|---|
| Giấy & mực | `--color-paper #FAF5EC`, `--color-paper-warm #F3EADA`, `--color-card #FFFCF5`, `--color-ink #3A2E2A`, `--color-ink-muted #7A6A5F` |
| Điểm nhấn | `--color-burgundy #6B1F2A`, `--color-burgundy-deep #4A121B`, `--color-terracotta #B85C38`, `--color-gold #C9A227`, `--color-gold-soft #E8D9A8`, `--color-apricot #E3B23C` |
| Focus | `--color-focus #7A1C24` (5.4:1 trên kem; gold chỉ làm quầng ngoài) |
| Chữ | `--font-display` Playfair Display, `--font-body` Be Vietnam Pro, subset `vietnamese`, `display=swap`; thang `--text-badge 14px`, `--text-title 28px` (22px ≤400px), `--text-body 18px` (20px ≥768px), `--text-label 14px` |
| Hình khối | `--radius-card 16px`, `--radius-envelope 8px`, `--space-card-pad 24px` (32px ≥768px), `--frame-inset 10px` |
| Bóng | `--shadow-envelope`, `--shadow-card`, `--shadow-letter`, `--shadow-seal` — luôn có offset + blur mềm |
| Nhịp | `--ease-expo cubic-bezier(0.16, 1, 0.3, 1)`; `--dur-seal 350ms`, `--dur-open-flap 500ms`, `--dur-open-letter 650ms` (delay 200ms), fade phong bì 400ms (delay 250ms), card settle 400ms (delay 450ms), stagger 320ms (base 400ms, bước 45ms, trần 180ms), `--dur-crossfade 180ms`, `--dur-petal-fade 1000ms` |

## Vật liệu

- **Hạt giấy:** một tile `feTurbulence` (fractalNoise, `baseFrequency 0.9`, 2 octave) nhúng `data:` URI, phủ trên `body` và `.greeting-card`. Không file ảnh.
- **Ánh sáng:** hai radial-gradient ấm (trên-trái, dưới-phải) trên nền giấy.
- **Con dấu sáp:** đĩa 60px radial lacquer đỏ, 3 vòng vàng đồng tâm, relief sáng/tối trong, nhãn `20/11` vàng nhạt `tabular-nums`, lớp `seal-glint` quét specular một lần ở Giai đoạn 1, hai nếp ruy-băng `.envelope-ribbon` dịch 2px khi hover. Hover chỉ dịch **con** — hit box `#envelope` đứng yên tuyệt đối.
- **Huy hiệu "20 • 11":** đĩa 64px cùng công thức vòng vàng, đặt trong ornament vẽ tay; không phải kicker/eyebrow trên tiêu đề.
- **Hoa văn:** 4 lớp SVG sen + cúc cách điệu (gương 4 góc) ở `::before`, khung đôi hairline terracotta + vàng ở `::after` (inset 10px), nhánh cúc nhỏ 48×12 làm divider dưới lời chúc. Tất cả là SVG `data:` URI, không file ảnh, không emoji.

## Bố cục

Điện thoại là gốc: phong bì `min(86vw, 340px)`, tỉ lệ 4/2.8, giữa màn hình; thẻ `min(92vw, 640px)`, `max-height: 92dvh`, cuộn trong. Thẻ là lớp phủ tuyệt đối canh giữa nên phong bì mờ dần không đẩy bố cục. ≥768px tăng chữ/padding; ≥1024px phong bì `min(30vw, 420px)`. Không sidebar, không nhiều cột.

## Chữ

Tiêu đề `Tri Ân Thầy Cô` — `text-wrap: balance`, `letter-spacing: -0.02em`, lề trên 1.75rem > dưới 0.75rem. Người nhận/người gửi in nghiêng Playfair. Lời chúc `text-wrap: pretty`, measure 65–75ch trên desktop. Mọi chữ Việt có dấu đầy đủ.

## Chuỗi mở 3 giai đoạn (chỉ khi `no-preference`)

1. **0–350ms — bóc sáp:** con dấu nhấc `translateY(-12px) scale(1.05)`, glint quét một lần; nắp xoay `rotateX(180deg)` trong 0–500ms, mặt trong burgundy-deep.
2. **200–850ms — rút thư:** `.envelope-letter-preview` trượt `translateY(-46%)`, bóng giãn, sáng nhẹ; cả phong bì mờ dần 250–650ms.
3. **400–900ms — an vị:** thẻ `scale(1.1) → 1` + fade 450ms; các con lần lượt dâng 8px và hiện: huy hiệu 400ms, tiêu đề 445ms, người nhận 490ms, lời chúc 535ms, người gửi + nút 580ms. Cánh hoa vào khung 500–700ms.

Đóng: thẻ biến mất, phong bì trở lại, cánh hoa mờ dần ≤1s.

## Cánh hoa

Canvas toàn màn hình `requestAnimationFrame`, 30 hạt (kẹp 10–40). Mỗi hạt là silhouette bezier có khấc, tông màu suy ra từ kích thước: vàng nhạt → apricot → terracotta → burgundy; hạt nhỏ = xa = nhạt hơn (opacity 0.35–0.85), tumble `scaleY(|cos rotation|)`, lắc `sin(phase)`. Sinh ở `y ∈ [-120, -20]` để vào khung đúng Giai đoạn 3, tốc độ 40–80px/s, chuyển động GPU-friendly trên một canvas duy nhất.

## Reduced motion

Không 3D, không cánh hoa (`count = 0`), không stagger, không pulse. Chỉ cross-fade `opacity` 180ms giữa phong bì và thẻ; nội dung hiện ngay sau 180ms, live region vẫn thông báo. Focus ring giữ nguyên.

## Bề mặt trình duyệt

`::selection` burgundy trên kem; `caret-color` burgundy; scrollbar thẻ 8px terracotta mờ trên track trong suốt; `font-variant-numeric: tabular-nums` cho mọi "20/11"/"20 • 11"; `:focus-visible` viền burgundy 3px offset 3px + quầng vàng 6px. Không bao giờ bỏ focus ring.

## Composer (tạo thiệp & chia sẻ)

Nút pill `#open-composer` ở góc dưới-phải ("Tạo thiệp mới", icon lông ngỗng vẽ SVG, nền burgundy, bóng lệch mềm). Bấm mở `#composer-panel`: lớp phủ `rgb(58 46 42 / 0.42)` (scrim đặc, không blur — craft-floor cấm glass), hộp kem `min(92vw, 520px)` có khung đôi hairline, hạt giấy, cùng token với thiệp. Bốn trường (tiêu đề, người nhận, lời chúc, người gửi) có nhãn thật, `aria-describedby` trỏ tới bộ đếm `tabular-nums` `n/120` (`.is-limit` burgundy đậm ở 120). Link chia sẻ read-only nền `#F7EFE1`. CTA chính burgundy ("Sao chép link gửi tặng"), CTA phụ viền vàng ("Xem thử thiệp"), trạng thái sao chép dưới dạng `aria-live="polite"`. Vào bằng animation 240ms `--ease-expo` (opacity + translateY 12px); reduced-motion chỉ cross-fade 160ms. Tab/Shift+Tab được giữ trong hộp thoại; `Escape` thuộc về composer khi nó đang mở (capture phase), nên thiệp bên dưới không đóng theo.

## Trạng thái

`closed` / `open` (BR-4), `opening`/`closing` chỉ là giai đoạn CSS. Rỗng → mặc định tiếng Việt từng trường; thiếu JS → phong bì + `<noscript>`; tham số độc hại → chữ literal qua `textContent`; giảm chuyển động → cross-fade. Không có trạng thái lỗi mạng vì không gọi mạng sau khi tải.

## Ranh giới (craft floor)

Không kicker trên tiêu đề, không gradient chữ, không glass/blur trang trí, không bóng cứng offset, không icon emoji, không mask hình học giả hữu cơ. Tương phản chữ ≥4.5:1; gold/apricot chỉ để trang trí.
