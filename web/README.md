# CodePush — giao diện web

SPA (Vite + React) gọi cùng REST API với CLI, dùng `Authorization: Bearer <access-key>`.

## Chạy dev

```bash
cd web && yarn && yarn dev
```

Mặc định Vite `http://localhost:5173`.

## CORS trên máy chủ API

Trỏ `CORS_ORIGIN` tới origin của trang (có thể nhiều giá trị cách nhau bằng dấu phẩy), ví dụ:

`http://localhost:5173,https://codepush.yourdomain.com`

## Build tĩnh

```bash
yarn build
```

Thư mục `dist/` có thể phục vụ bằng nginx, S3, v.v.; trang dùng đúng URL API bạn nhập lúc đăng nhập.
