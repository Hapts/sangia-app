# SĂN GIÁ 2.2 — Website + Netlify Functions

## Mục tiêu
Giữ nguyên website hiện tại, thêm chức năng backend trả kết quả giá **đọc và xác minh được** từ website bán hàng; nếu cửa hàng chặn máy tự động thì **không hiển thị giá bịa**.

## Quan trọng trước khi dùng
- Netlify Drop **chỉ** xuất bản được các file tĩnh nếu chức năng build Functions không được chạy. Để bảo đảm Functions được cài đặt, dùng phương án **Git-connected deploy** hoặc **Netlify CLI**. Với một số tài khoản Netlify, thả thư mục project khi đã đăng nhập có thể chạy bước build; sau khi đăng phải xác nhận `/api/health` trả JSON (`"engine":"netlify-functions"`).
- Không thể chỉ tải ZIP lên rồi chắc chắn website có chức năng lấy giá tự động. Nếu `/api/health` trả 404, Functions chưa được triển khai.
- Bản này chưa có database lưu lâu dài, chưa có cơ chế tự động cập nhật mới toàn bộ danh mục. Cache giá chỉ tạm thời ở bộ nhớ mỗi function và có thể mất khi hệ thống khởi động lại.
- Netlify có giới hạn thời gian và lượt chạy; nhà bán có thể chặn robots, HTML thay đổi hoặc không cung cấp bảng giá màu. Kiểm tra giá trước khi mua.
- Để có tìm kiếm sản phẩm rộng hơn, bạn có thể tạo Serper API key của riêng mình và đặt `SERPER_API_KEY` trong Netlify > Project configuration > Environment variables; không đưa key vào HTML.

## Cấu trúc
- `site/`: giao diện + PWA, không có giá demo trong chế độ chính.
- `netlify/functions/`: 6 backend API: `health`, `shops`, `catalog`, `suggest`, `product-links`, `compare`.
- `netlify/lib/`: bộ đọc giá HTML/JSON-LD, đối chiếu dung lượng/màu.
- `netlify.toml`: chỉ dẫn Netlify xuất bản thư mục `site` và chuyển `/api/*` vào Netlify Functions.

## Đưa vào website Netlify ĐANG CÓ — nên dùng GitHub (không cần tự viết code)
1. Giải nén ZIP, tạo một repository GitHub và upload **toàn bộ file/thư mục trong thư mục dự án** (không chỉ `site/`).
2. Mở Netlify > website `checkgiadienthoai` > Project configuration > Build & deploy > Continuous deployment > Link repository. Chọn repository đó. Nếu giao diện Netlify khác, tìm mục **Connect to Git** trong Site configuration.
3. Trong cấu hình: Build command để trống, Publish directory là `site`, Functions directory là `netlify/functions` (đã nằm trong `netlify.toml`). Deploy production.
4. Mở `https://checkgiadienthoai.netlify.app/api/health` và chắc chắn thấy `{ "ok": true, "engine": "netlify-functions", ... }`. Nếu thấy HTML 404 thì backend chưa chạy. Kiểm tra trong Netlify > Logs > Functions.
5. Mở trang chính, gõ iPhone 17 Pro Max; danh sách giá chỉ hiện khi ít nhất một website cho phép đọc giá thật. Xem `storesStatus` ở `/api/compare?q=iPhone%2017%20Pro%20Max` nếu không có kết quả.

**Netlify chỉ hỗ trợ chạy backend, không đảm bảo các cửa hàng cung cấp dữ liệu giá**. Đối với mức cập nhật ổn định mỗi 15–30 phút và phát hiện sản phẩm mới, cần nguồn dữ liệu đáng tin cậy và cơ sở dữ liệu/bộ quét định kỳ — chưa bao gồm trong bản này.

## Chạy test offline
`node --test test/*.test.mjs`

## Lưu ý ứng dụng điện thoại
Netlify HTTPS + manifest + icon + service-worker hỗ trợ cài lên màn hình chính. Trên iPhone: Safari > Chia sẻ > Thêm vào màn hình chính. Chrome Android: menu > Cài ứng dụng (khi đủ điều kiện). Đây là PWA, **không phải APK**.
