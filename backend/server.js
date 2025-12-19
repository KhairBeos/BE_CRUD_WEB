const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require('dotenv').config();
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// Kết nối MongoDB với username là MSSV, password là MSSV, dbname là it4409
const mongoUri = process.env.MONGO_URI || "mongodb+srv://20225202:20225202@cluster0.qhtu7br.mongodb.net/it4409?retryWrites=true&w=majority";
mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));
// TODO: Tạo Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tên không được để trống"],
    minlength: [2, "Tên phải có ít nhất 2 ký tự"],
  },
  age: {
    type: Number,
    required: [true, "Tuổi không được để trống"],
    min: [0, "Tuổi phải >= 0"],
  },
  email: {
    type: String,
    required: [true, "Email không được để trống"],
    match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    unique: true,
  },
  address: {
    type: String,
  },
});
// `unique: true` on the `email` field already creates a unique index,
// so no separate `schema.index()` call is needed.
const User = mongoose.model("User", UserSchema);

// TODO: Implement API endpoints
app.get("/api/users", async (req, res) => {
  try {
    // Lấy query params
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    // Giới hạn page/limit
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 5;
    const MAX_LIMIT = 50;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const search = req.query.search || "";
    // Tạo query filter cho search
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    // Tính skip
    const skip = (page - 1) * limit;
    // Query song song
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    // Trả về response
    res.json({
      page,
      limit,
      total,
      totalPages,
      data: users,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    let { name, age, email, address } = req.body || {};
    // Chuẩn hoá giá trị đầu vào
    name = typeof name === 'string' ? name.trim() : name;
    email = typeof email === 'string' ? email.trim().toLowerCase() : email;
    address = typeof address === 'string' ? address.trim() : address;
    if (typeof age === 'string') age = parseInt(age, 10);

    // Kiểm tra email duy nhất
    if (email) {
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ error: 'Email đã tồn tại' });
      }
    }

    // Tạo user mới
    const newUser = await User.create({ name, age, email, address });
    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { name, age, email, address } = req.body || {};
    // Chỉ cập nhật trường được truyền vào
    const update = {};
    if (typeof name !== 'undefined') update.name = typeof name === 'string' ? name.trim() : name;
    if (typeof email !== 'undefined') update.email = typeof email === 'string' ? email.trim().toLowerCase() : email;
    if (typeof address !== 'undefined') update.address = typeof address === 'string' ? address.trim() : address;
    if (typeof age !== 'undefined') update.age = typeof age === 'string' ? parseInt(age, 10) : age;

    // Nếu email thay đổi, kiểm tra trùng
    if (update.email) {
      const conflict = await User.findOne({ email: update.email, _id: { $ne: id } });
      if (conflict) {
        return res.status(400).json({ error: 'Email đã tồn tại' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'Email đã tồn tại' });
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start server using PORT from env with fallback
const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-console
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
