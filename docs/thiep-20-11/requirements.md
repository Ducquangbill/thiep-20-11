# Requirements — thiep-20-11

## Business Need & Goal
Thiếu một phương thức gửi lời chúc 20/11 (Ngày Nhà giáo Việt Nam) trực tuyến, nhanh và trang trọng. Sản phẩm là một trang web tĩnh hiển thị **một thiệp duy nhất** dạng showcase: người dùng bấm mở phong bì 3D, xem thiệp chúc mừng với hiệu ứng cánh hoa rơi. Mục tiêu: dễ cá nhân hoá qua URL (không cần backend/database) để ai cũng có thể gửi thiệp riêng cho thầy/cô của mình chỉ bằng một đường link.

**Product vision:** một trải nghiệm "mở thư" cảm xúc — mở phong bì → thiệp hiện ra → cánh hoa rơi — hoạt động mượt trên cả điện thoại và máy tính, tải nhanh, tiếng Việt hiển thị chuẩn.

## User Stories

- **US-1:** As a *người tặng*, tôi muốn **mở phong bì bằng một cú bấm** (hiệu ứng 3D mượt) để người nhận có cảm giác "mở thư thật".
- **US-2:** As a *người tặng*, tôi muốn **đóng lại phong bì** để xem lại hiệu ứng mở thư nhiều lần hoặc trình diễn cho người khác.
- **US-3:** As a *người tặng*, tôi muốn **điền tiêu đề (`Tri Ân Thầy Cô`) / tên người nhận / lời chúc / tên người gửi vào URL** để tạo link thiệp riêng mà không cần đăng ký hay lưu trữ.
- **US-4:** As a *người nhận*, tôi muốn **mở link và đọc lời chúc hiển thị đúng tiếng Việt**, có dấu, trên điện thoại lẫn máy tính.
- **US-5:** As a *người nhận*, tôi muốn **hiệu ứng cánh hoa rơi nhẹ nhàng** để tăng cảm giác ấm áp, trang trọng.
- **US-6:** As a *người dùng bị rối vận động (motion-sensitive)*, tôi muốn **hiệu ứng động được giảm/tắt** khi hệ điều hành bật chế độ giảm chuyển động, để dùng thiệp an toàn.
- **US-7:** As a *người tặng/ nhận*, tôi muốn **trang tải nhanh trên 4G/máy yếu**, không phải chờ đợi.
- **US-8:** As a *người tặng*, tôi muốn **gõ tiếng Việt vào một bảng soạn thảo nhỏ rồi nhận link chia sẻ** để tạo nhiều thiệp cho nhiều thầy/cô mà không cần tự viết `+` hay mã hoá URL.

## Scope

- **In scope:**
  - 1 trang thiệp đơn (single showcase card), layout dọc/trung tâm.
  - Tương tác phong bì 3D: bấm mở, bấm đóng/xem lại.
  - Nội dung thiệp: tiêu đề (mặc định "Tri Ân Thầy Cô", tuỳ biến được), lời chúc, tên người nhận, tên người gửi.
  - Hiệu ứng cánh hoa rơi (canvas/CSS particles, nhẹ).
  - Tuỳ biến qua URL query params với fallback về nội dung mặc định tiếng Việt.
  - Bảng soạn thảo nhanh "Tạo thiệp mới" (quick composer) + sinh link chia sẻ đã mã hoá.
  - Static web thuần HTML/CSS/JS (hoặc Vite build nhẹ), không backend.
- **Out of scope:**
  - Backend, database, bất kỳ hình thức lưu trữ dữ liệu nào.
  - Nhạc nền / music player.
  - Thư viện ảnh / photo gallery / upload ảnh.
  - Bức tường nhiều thiệp (multi-card wall), danh sách thiệp, điều hướng giữa nhiều thiệp.
  - Đếm lượt mở, chia sẻ qua API mạng xã hội, analytics.

## Business Rules

- `BR-1`: Cá nhân hoá chỉ qua URL query params, tối đa 4 tham số: `title` (tiêu đề thiệp), `to` (người nhận), `msg` (lời chúc), `from` (người gửi) — criterion: param đúng tên, giá trị được giải mã URL (decodeURIComponent), độ dài hiển thị ≤ 120 ký tự mỗi trường (giá trị dài hơn bị cắt với dấu `…`) — OK: `?title=Chúc+Mừng+Sinh+Nhật+Mẹ&to=Mẹ&msg=Chúc%20mẹ%20vui&from=Quang` / BAD: `?recipient=...` (tên sai → bỏ qua).
- `BR-2`: Thiếu 1 hoặc cả 4 params → dùng nội dung mặc định trang trọng tiếng Việt (tiêu đề "Tri Ân Thầy Cô", lời chúc mặc định, người gửi "Người học trò của bạn") — criterion: URL không có params hiển thị đúng bộ nội dung mặc định, không hiển thị chỗ trống — OK: `https://site/` / BAD: hiển thị "undefined" hoặc ô trống.
- `BR-3`: Params chứa ký tự cần escape (`<`, `>`, `"`) phải được hiển thị an toàn dạng text, không được thực thi — criterion: giá trị `<script>alert(1)</script>` xuất hiện như chữ trên màn hình, không chạy script — OK: text literal / BAD: script chạy.
- `BR-4`: Trạng thái phong bì chỉ có 2 trạng thái: `closed` (khởi tạo) và `open` — criterion: lần đầu tải luôn là `closed`; 1 lần bấm chuyển sang `open`; bấm lại đóng về `closed` — OK: toggle đúng mỗi lần bấm / BAD: bấm 1 lần chuyển 2 trạng thái.
- `BR-5`: Hiệu ứng cánh hoa chỉ chạy khi phong bì ở trạng thái `open` — criterion: ở `closed` không có cánh hoa rơi trên màn hình; ngay khi mở, cánh hoa bắt đầu rơi — OK / BAD: cánh hoa rơi trước khi mở thiệp.
- `BR-6`: Khi hệ điều hành bật `prefers-reduced-motion: reduce` — hiệu ứng cánh hoa và animation 3D được thay bằng trạng thái tĩnh tức thời (phong bì mở thẳng, không hoặc rất ít chuyển động) — criterion: bật reduce → mở phong bì trong ≤ 1 lần chuyển tiếp ngắn hoặc tức thời, 0 cánh hoa rơi liên tục — OK / BAD: vẫn rơi cánh hoa đầy hiệu ứng.
- `BR-7`: Link chia sẻ của bảng soạn thảo được sinh bằng hàm thuần `buildShareUrl(baseUrl, { title, to, msg, from })` dùng `URLSearchParams` (thứ tự `title`, `to`, `msg`, `from`; chỉ thêm trường không rỗng sau `trim`, cắt ≤ 120 ký tự) — criterion: dấu cách mã hoá thành `+`, dấu tiếng Việt/`ễ`/`đ` và ký tự đặc biệt mã hoá percent, trường rỗng bị bỏ khỏi URL, và vòng khứ hồi `resolveParams(buildShareUrl(...))` trả đúng nguyên văn nội dung đã nhập — OK: `?title=Ch%C3%BAc+M%E1%BB%ABng&to=C%C3%B4+Lan` / BAD: URL chứa `Cô Lan` thô chưa mã hoá.

## Functional Requirements & Acceptance Criteria

- `FR-1`: **Phong bì 3D mở/đóng** → AC:
  - Given trang vừa tải / When người dùng nhìn màn hình / Then phong bì ở trạng thái đóng, có chỉ dẫn trực quan (mũi tên/nút "Nhấn để mở") rõ ràng.
  - Given phong bì đang đóng / When người dùng bấm phong bì (hoặc nhấn `Enter` khi nó nhận focus) / Then trong ≤ 1s phong bì chuyển động mượt (nắp mở lên theo phối cảnh 3D) và thiệp bên trong hiện ra hoàn chỉnh.
  - Given phong bì đang mở / When bấm nút "Đóng lại" / Then phong bì đóng lại và có thể mở lại lần nữa với hiệu ứng như lần đầu.
- `FR-2`: **Nội dung thiệp** → AC:
  - Given trạng thái `open` / When thiệp hiển thị / Then trên thiệp có đủ 4 phần: tiêu đề (mặc định "Tri Ân Thầy Cô", có thể tuỳ biến), lời chúc, "Gửi: {tên người nhận}", "Từ: {tên người gửi}", theo đúng nội dung từ URL hoặc mặc định (`BR-1`, `BR-2`).
  - Given giá trị param vượt 120 ký tự / When hiển thị / Then bị cắt với dấu `…`, layout không vỡ.
- `FR-3`: **Cánh hoa rơi** → AC:
  - Given thiệp đang mở / When animation chạy / Then cánh hoa rơi từ mép trên xuống dưới màn hình, chuyển động nhẹ nhàng (tốc độ chậm, có độ trễ/lắc nhẹ tự nhiên), số hạt vừa phải (≥ 10 và ≤ 40 hạt hiển thị cùng lúc), không che nội dung thiệp quan trọng.
  - Given người dùng đóng phong bì / When về trạng thái `closed` / Then cánh hoa đang rơi biến mất dần (fade) trong ≤ 1s, không tạo hạt mới.
- `FR-4`: **Tuỳ biến URL + fallback** → AC:
  - Given URL có `title`/`to`/`msg`/`from` / When trang tải / Then nội dung thiệp đúng như params (đã decode), tiêu đề mặc định `Tri Ân Thầy Cô` khi `title` thiếu hoặc rỗng.
  - Given URL không có params hoặc param rỗng / When trang tải / Then thiệp dùng nội dung mặc định tiếng Việt (`BR-2`), không lỗi console.
- `FR-5`: **Chỉ dẫn tương tác** → AC:
  - Given phong bì `closed` / When lần đầu xem / Then có nhãn rõ "Nhấn để mở thiệp" (người mới không phải đoán).
  - Given người dùng chỉ dùng bàn phím / When tab tới phong bì / Then phong bì nhận focus, bấm `Enter`/`Space` mở thiệp như click chuột.
- `FR-6`: **Bảng soạn thảo nhanh "Tạo thiệp mới" + link chia sẻ** → AC:
  - Given người tặng đang xem trang / When bấm nút nổi `#open-composer` ("Tạo thiệp mới") / Then mở bảng `#composer-panel` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="composer-title"`), tiêu điểm chuyển vào `#input-to`.
  - Given URL chứa `?compose=1` / When trang tải / Then bảng soạn thảo tự mở; URL không có `compose=1` → bảng đóng mặc định (link chia sẻ `?title=...&to=...&msg=...&from=...` vẫn mở thiệp thuần, chỉ còn nút nổi).
  - Given bảng đang mở / When người dùng bấm `Escape` hoặc `#close-composer` / Then bảng đóng, tiêu điểm về `#open-composer`, phong bì phía sau **không** bị chuyển trạng thái.
  - Given 4 ô `#input-title`/`#input-to`/`#input-msg`/`#input-from` (`maxlength="120"` + bộ đếm `#count-title`/`#count-to`/`#count-msg`/`#count-from` nối qua `aria-describedby`) / When người dùng gõ / Then bộ đếm hiển thị `{độ dài}/120` đúng (`.is-limit` khi chạm 120) và ô `#share-url` (`readonly`) hiển thị URL sinh bởi `buildShareUrl` (đã mã hoá, bỏ trường rỗng — `BR-7`).
  - Given nội dung đã nhập / When bấm `#copy-link` ("Sao chép link gửi tặng") / Then URL được chép qua `navigator.clipboard.writeText` (fallback: chọn `#share-url` để chép tay), `#composer-status` (`aria-live="polite"`) thông báo "Đã sao chép link thiệp vào bộ nhớ tạm".
  - Given nội dung đã nhập / When bấm `#preview-card` ("Xem thử thiệp") / Then `{ title, to, msg, from }` được ghi vào `#card-title`/`#card-to`/`#card-msg`/`#card-from` qua `textContent` (trường rỗng → mặc định `BR-2`), URL cập nhật qua `history.replaceState`, bảng đóng, phong bì mở để người gửi thấy đúng như người nhận sẽ thấy.

## Non-Functional Requirements (NFRs)

- **NFR-1 Responsive:** hiển thị đúng trên màn hình ≥ 320px (mobile nhỏ) đến desktop ≥ 1440px; thiệp luôn nằm gọn trong viewport đầu tiên (không cần cuộn để xem thiệp trên mobile).
- **NFR-2 Performance (60fps):** animation mở phong bì và cánh hoa đạt ≥ 55fps trên máy trung bình (mở DevTools, không thấy frame drop kéo dài > 200ms); chạy trên GPU transform/opacity, không gây reflow mỗi frame.
- **NFR-3 Tải nhanh:** tổng tài nguyên trang (HTML+CSS+JS, chưa đếm ảnh tuỳ chọn) ≤ 200KB nén; lần tải đầu trên 4G hiển thị phong bì trong ≤ 2s.
- **NFR-4 Accessibility:** phong bì là phần tử focusable (`tabindex`, `role="button"`, nhãn accessible); nội dung thiệp là text thực (không phải ảnh chữ); hỗ trợ `prefers-reduced-motion` (`BR-6`); độ tương phản chữ trên thiệp ≥ 4.5:1.
- **NFR-5 Vietnamese typography:** dùng font hệ thống hoặc webfont hỗ trợ đầy đủ dấu tiếng Việt (dấu huyền, hỏi, ngã, sắc, nặng, không dấu,`ễ`, `ươ`, `đ`) — kiểm tra: chuỗi "Nguyễn Trường An, chúc mừng Ngày Nhà giáo 20/11" hiển thị không lệch dấu, không vỡ glyph.
- **NFR-6 Khả dụng nền tảng:** chạy trong Chrome/Edge/Firefox/Safari bản hiện đại (2 năm gần nhất) và Safari iOS; không yêu cầu bật JS của bên thứ 3.
- **NFR-7 Bảo mật nội dung:** mọi giá trị URL được escape khi chèn vào DOM (`BR-3`).

## Edge Cases & Contradictions

- **Trống:** param có nhưng rỗng (`?to=`) → coi như không truyền, dùng mặc định cho trường đó (`BR-2`).
- **Độ dài:** param > 120 ký tự → cắt với `…`, không tràn layout (`FR-2`).
- **Ký tự nguy hiểm:** param chứa HTML/JS → hiển thị dạng literal text (`BR-3`, `FR-5` trong NFR-7).
- **Chế độ giảm chuyển động:** `prefers-reduced-motion` → tĩnh tức thời, không cánh hoa (`BR-6`).
- **Bấm nhanh nhiều lần:** spam click phong bì → toggle nhất quán, không kẹt giữa 2 trạng thái, không tạo trùng cánh hoa (`BR-4`).
- **Thiết bị yếu/mất GPU:** animation phong bì/cánh hoa fallback nhẹ hơn nhưng nội dung thiệp luôn hiển thị đủ (`FR-2` không phụ thuộc animation hoàn tất để hiện text).
- **URL encode lạ:** `to` chứa `%` không hợp lệ (`%zz`) → `decodeURIComponent` lỗi → dùng nguyên chuỗi gốc hoặc fallback trường đó, không crash trang.
- **Composer clipboard bị chặn:** `navigator.clipboard` không tồn tại hoặc từ chối quyền (http/`file://` non-secure) → fallback chọn `#share-url`; user vẫn chép tay được (ô `readonly` luôn hiển thị URL).
- **Composer trường rỗng:** gõ rồi xoá hết → `buildShareUrl` bỏ trường đó khỏi URL; `#preview-card` vẫn dùng mặc định (`BR-2`), không ô trống.
- **Composer + Escape:** bảng đang mở, bấm `Escape` → chỉ đóng bảng, không chạm phong bì phía sau (`FR-6`).
- **Composer + spam:** bấm nhanh `#copy-link`/`#preview-card` nhiều lần → mỗi lần dùng cùng nội dung hiện tại, không ghi đè sai, `replaceState` an toàn không điều hướng.

## Open Questions
- `none` — phạm vi đã đủ rõ để triển khai; quyết định còn lại (nội dung lời chúc mặc định cụ thể, ảnh nền nếu có) thuộc trách nhiệm Designer, không chặn requirements.
