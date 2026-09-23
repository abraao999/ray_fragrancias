import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: "" },
      cep: { type: String, required: true }
    },
    address: {
      cep: { type: String, required: true },
      street: { type: String, required: true },
      number: { type: String, required: true },
      complement: { type: String, default: "" },
      neighborhood: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true }
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    shippingOption: {
      id: { type: String, default: "" },
      service: { type: String, default: "" },
      company: { type: String, default: "" },
      price: { type: Number, default: 0 },
      deliveryDays: { type: Number, default: 0 }
    },
    total: { type: Number, required: true },
    paymentProvider: { type: String, default: "mercado_pago" },
    paymentPreferenceId: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["not_started", "pending", "approved", "rejected", "cancelled", "refunded"],
      default: "not_started"
    },
    paymentMethod: { type: String, default: "" },
    paymentUrl: { type: String, default: "" },
    trackingCode: { type: String, default: "" },
    customerNote: { type: String, default: "" },
    internalNote: { type: String, default: "" },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: "" },
        changedAt: { type: Date, default: Date.now }
      }
    ],
    status: {
      type: String,
      enum: ["pending", "paid", "shipping", "delivered", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
