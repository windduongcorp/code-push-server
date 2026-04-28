# CodePush — giao diện web

SPA (Vite + React) gọi cùng REST API với CLI, dùng `Authorization: Bearer <access-key>`.

## Chạy dev

```bash
cd web && yarn && yarn dev
```

Mặc định Vite `http://localhost:5173`.

## Dev proxy mode (tạm né CORS)

Khi chạy local, bạn có thể bật checkbox **"Dùng dev proxy"** ở màn hình đăng nhập.
Lúc này web gọi qua đường dẫn `/__cp` (Vite proxy) thay vì gọi thẳng backend từ trình duyệt.

Mặc định proxy target là `https://codepush.windduong.com`.
Đổi target bằng biến môi trường:

```bash
VITE_DEV_PROXY_TARGET=https://your-api.example.com yarn dev
```

## CORS trên máy chủ API

Trỏ `CORS_ORIGIN` tới origin của trang (có thể nhiều giá trị cách nhau bằng dấu phẩy), ví dụ:

`http://localhost:5173,https://codepush.yourdomain.com`

## Build tĩnh

```bash
yarn build
```

Thư mục `dist/` có thể phục vụ bằng nginx, S3, v.v.; trang dùng đúng URL API bạn nhập lúc đăng nhập.
