"use client";

import { useState, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const TEAM_MEMBERS = [
  { name: "Murad", email: "murad@plusmaterials.com" },
  { name: "Zoeb", email: "zoeb@plusmaterials.com" },
  { name: "Ali", email: "ali@plusmaterials.com" },
  { name: "Ruby", email: "ruby@plusmaterials.com" },
  { name: "Sadaf", email: "sadaf@plusmaterials.com" },
  { name: "Zubair", email: "zubair@plusmaterials.com" },
];

const LOGISTICS_MEMBERS = [
  { name: "Rita", email: "rita@plusmaterials.com" },
  { name: "Farida", email: "farida.lakhani@plusmaterials.com" },
  { name: "Sahil", email: "Sahil@plusmaterials.com" },
  { name: "Sumera", email: "sumera.kajani@plusmaterials.com" },
];

const DEPARTMENTS = ["PRN", "PLUS", "PRN SE", "Walton"];

const PRODUCT_GRADES = [
  "Plastic job lot",
  "Paper job lot",
  "Waste and Scrap of Paper",
  "Waste and Scrap of Plastic",
];

const SHIPPING_TERMS = ["FOB", "FAS", "CIF", "Delivered"];

const PAYMENT_TERMS = [
  "100% Advance",
  "50% Advance Net 30",
  "50% Advance Net 60",
  "20% Advance",
  "30% Advance",
  "Net 7",
  "Net 14",
  "Net 30",
  "Net 60",
  "DA 120",
  "Against Documents CIF",
];

interface FormState {
  buyingManager: string;
  salesRepresentative: string;
  secondaryAccountManagers: string[];
  logisticsManager: string;
  logisticsManagerOtherName: string;
  logisticsManagerOtherEmail: string;
  department: string;
  vendor: string;
  placeOfLoading: string;
  portRamp: string;
  productGrade: string;
  poItems: string;
  pricing: string;
  customerBooking: File | null;
  customerPO: File | null;
  minimumLoadingWeight: string;
  poShippingTerms: string;
  finalDestination: string;
  icd: string;
  containerQuantity: string;
  targetShipDate: string;
  customer: string;
  soDescription: string;
  soPrice: string;
  soQty: string;
  paymentTerms: string;
  additionalNotes: string;
  pictures: File[];
}

const initial: FormState = {
  buyingManager: "",
  salesRepresentative: "",
  secondaryAccountManagers: [],
  logisticsManager: "",
  logisticsManagerOtherName: "",
  logisticsManagerOtherEmail: "",
  department: "",
  vendor: "",
  placeOfLoading: "",
  portRamp: "",
  productGrade: "",
  poItems: "",
  pricing: "",
  customerBooking: null,
  customerPO: null,
  minimumLoadingWeight: "",
  poShippingTerms: "",
  finalDestination: "",
  icd: "",
  containerQuantity: "",
  targetShipDate: "",
  customer: "",
  soDescription: "",
  soPrice: "",
  soQty: "",
  paymentTerms: "",
  additionalNotes: "",
  pictures: [],
};

export default function NewOrderForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [trackingNumber, setTrackingNumber] = useState<number | null>(null);
  const customerBookingRef = useRef<HTMLInputElement>(null);
  const customerPORef = useRef<HTMLInputElement>(null);
  const picturesRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => set(e.target.name as keyof FormState, e.target.value);

  const toggleCheckbox = (email: string) => {
    setForm((prev) => {
      const arr = prev.secondaryAccountManagers;
      return {
        ...prev,
        secondaryAccountManagers: arr.includes(email)
          ? arr.filter((v) => v !== email)
          : [...arr, email],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const fd = new FormData();

      fd.append("buyingManager", form.buyingManager);
      fd.append("salesRepresentative", form.salesRepresentative);
      fd.append("secondaryAccountManagers", form.secondaryAccountManagers.join(", "));
      fd.append("logisticsManager", form.logisticsManager);
      fd.append("logisticsManagerOtherName", form.logisticsManagerOtherName);
      fd.append("logisticsManagerOtherEmail", form.logisticsManagerOtherEmail);
      fd.append("department", form.department);
      fd.append("vendor", form.vendor);
      fd.append("placeOfLoading", form.placeOfLoading);
      fd.append("portRamp", form.portRamp);
      fd.append("productGrade", form.productGrade);
      fd.append("poItems", form.poItems);
      fd.append("pricing", form.pricing);
      fd.append("minimumLoadingWeight", form.minimumLoadingWeight);
      fd.append("poShippingTerms", form.poShippingTerms);
      fd.append("finalDestination", form.finalDestination);
      fd.append("icd", form.icd);
      fd.append("containerQuantity", form.containerQuantity);
      fd.append("targetShipDate", form.targetShipDate);
      fd.append("customer", form.customer);
      fd.append("soDescription", form.soDescription);
      fd.append("soPrice", form.soPrice);
      fd.append("soQty", form.soQty);
      fd.append("paymentTerms", form.paymentTerms);
      fd.append("additionalNotes", form.additionalNotes);

      if (form.customerBooking) fd.append("customerBooking", form.customerBooking);
      if (form.customerPO) fd.append("customerPO", form.customerPO);
      form.pictures.forEach((pic) => fd.append("pictures", pic));

      const res = await fetch("/api/submit-order", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      const data = await res.json();
      setTrackingNumber(data.trackingNumber ?? null);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setForm(initial);
    setStatus("idle");
    setErrorMsg("");
    setTrackingNumber(null);
    if (customerBookingRef.current) customerBookingRef.current.value = "";
    if (customerPORef.current) customerPORef.current.value = "";
    if (picturesRef.current) picturesRef.current.value = "";
  };

  if (status === "success") {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Order Submitted</h2>
        {trackingNumber && (
          <p className="text-blue-600 font-semibold text-lg mb-1">Tracking #{trackingNumber}</p>
        )}
        <p className="text-gray-500 mb-6">Your order has been saved and a confirmation email has been sent.</p>
        <button
          onClick={handleReset}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Submit Another Order
        </button>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 px-8 py-6 flex items-center gap-4">
          <img src="/logo.png" alt="Plus Materials" className="h-12 w-12 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">New Order</h1>
            <p className="text-blue-100 text-sm mt-0.5">Plus Materials — Order Submission</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-blue-200 hover:text-white text-xs font-medium transition-colors"
          >
            Sign out
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">

          {/* Buyer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buyer <span className="text-red-500">*</span>
            </label>
            <select name="buyingManager" value={form.buyingManager} onChange={handleChange} required className={inputCls}>
              <option value="">Select buyer</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m.email} value={m.email}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Sales Rep */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Rep <span className="text-red-500">*</span>
            </label>
            <select name="salesRepresentative" value={form.salesRepresentative} onChange={handleChange} required className={inputCls}>
              <option value="">Select sales rep</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m.email} value={m.email}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Secondary Account Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Account Manager</label>
            <div className="space-y-2">
              {TEAM_MEMBERS.map((m) => (
                <label key={m.email} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.secondaryAccountManagers.includes(m.email)}
                    onChange={() => toggleCheckbox(m.email)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Logistics Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logistics Manager</label>
            <div className="space-y-2">
              {LOGISTICS_MEMBERS.map((m) => (
                <label key={m.email} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="logisticsManager"
                    value={m.email}
                    checked={form.logisticsManager === m.email}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{m.name}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="logisticsManager"
                  value="other"
                  checked={form.logisticsManager === "other"}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Other</span>
              </label>
              {form.logisticsManager === "other" && (
                <div className="ml-6 space-y-2 pt-1">
                  <input
                    type="text"
                    name="logisticsManagerOtherName"
                    value={form.logisticsManagerOtherName}
                    onChange={handleChange}
                    placeholder="Full name"
                    className={inputCls}
                  />
                  <input
                    type="email"
                    name="logisticsManagerOtherEmail"
                    value={form.logisticsManagerOtherEmail}
                    onChange={handleChange}
                    placeholder="Email address"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select the Department <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {DEPARTMENTS.map((dept) => (
                <label key={dept} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="department"
                    value={dept}
                    checked={form.department === dept}
                    onChange={handleChange}
                    required
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{dept}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor <span className="text-red-500">*</span>
            </label>
            <input type="text" name="vendor" value={form.vendor} onChange={handleChange} required placeholder="Enter vendor name" className={inputCls} />
          </div>

          {/* Place of Loading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Place of Loading</label>
            <input type="text" name="placeOfLoading" value={form.placeOfLoading} onChange={handleChange} placeholder="Enter FOB location" className={inputCls} />
          </div>

          {/* Port / Ramp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Port / Ramp</label>
            <input type="text" name="portRamp" value={form.portRamp} onChange={handleChange} placeholder="Enter export port or ramp" className={inputCls} />
          </div>

          {/* Product / Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product / Grade <span className="text-red-500">*</span>
            </label>
            <select name="productGrade" value={form.productGrade} onChange={handleChange} required className={inputCls}>
              <option value="">Select product/grade</option>
              {PRODUCT_GRADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Purchase Order Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Order Items <span className="text-red-500">*</span>
            </label>
            <textarea name="poItems" value={form.poItems} onChange={handleChange} required placeholder="Enter purchase order items" rows={3} className={`${inputCls} resize-none`} />
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pricing</label>
            <textarea name="pricing" value={form.pricing} onChange={handleChange} placeholder="Enter pricing" rows={3} className={`${inputCls} resize-none`} />
          </div>

          {/* Minimum Loading Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Loading Weight <span className="text-red-500">*</span>
            </label>
            <input type="text" name="minimumLoadingWeight" value={form.minimumLoadingWeight} onChange={handleChange} required placeholder="e.g. 20 MT" className={inputCls} />
          </div>

          {/* Purchase Order Shipping Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order Shipping Terms</label>
            <select name="poShippingTerms" value={form.poShippingTerms} onChange={handleChange} className={inputCls}>
              <option value="">Select shipping terms</option>
              {SHIPPING_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Final Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Destination <span className="text-red-500">*</span>
            </label>
            <input type="text" name="finalDestination" value={form.finalDestination} onChange={handleChange} required placeholder="Enter final destination" className={inputCls} />
          </div>

          {/* ICD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ICD</label>
            <input type="text" name="icd" value={form.icd} onChange={handleChange} placeholder="Enter ICD" className={inputCls} />
          </div>

          {/* Container / Load Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Container / Load Quantity <span className="text-red-500">*</span>
            </label>
            <input type="text" name="containerQuantity" value={form.containerQuantity} onChange={handleChange} required placeholder="e.g. 5x40HC" className={inputCls} />
          </div>

          {/* Target Ship Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Ship Date <span className="text-red-500">*</span>
            </label>
            <input type="date" name="targetShipDate" value={form.targetShipDate} onChange={handleChange} className={inputCls} />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-1">If no confirmed customer, please share tentative for SI</p>
            <input type="text" name="customer" value={form.customer} onChange={handleChange} required placeholder="Enter customer name" className={inputCls} />
          </div>

          <hr className="border-gray-100" />

          {/* Sales Order Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order Description</label>
            <textarea name="soDescription" value={form.soDescription} onChange={handleChange} placeholder="Enter sales order description" rows={3} className={`${inputCls} resize-none`} />
          </div>

          {/* Sales Order Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order Price</label>
            <textarea name="soPrice" value={form.soPrice} onChange={handleChange} placeholder="Enter sales order price" rows={3} className={`${inputCls} resize-none`} />
          </div>

          {/* Sales Order QTY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order QTY (Weights in MT)</label>
            <input type="text" name="soQty" value={form.soQty} onChange={handleChange} placeholder="e.g. 100 MT" className={inputCls} />
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className={inputCls}>
              <option value="">Select payment terms</option>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={form.additionalNotes}
              onChange={handleChange}
              rows={4}
              placeholder="Any additional information..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Customer Booking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Booking</label>
            <div className="border border-dashed border-gray-300 rounded-lg px-4 py-4 bg-gray-50">
              <input
                ref={customerBookingRef}
                type="file"
                onChange={(e) => set("customerBooking", e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 w-full"
              />
              {form.customerBooking && <p className="text-xs text-gray-500 mt-1">{form.customerBooking.name}</p>}
            </div>
          </div>

          {/* Customer PO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer PO</label>
            <div className="border border-dashed border-gray-300 rounded-lg px-4 py-4 bg-gray-50">
              <input
                ref={customerPORef}
                type="file"
                onChange={(e) => set("customerPO", e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 w-full"
              />
              {form.customerPO && <p className="text-xs text-gray-500 mt-1">{form.customerPO.name}</p>}
            </div>
          </div>

          {/* Pictures */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pictures</label>
            <div className="border border-dashed border-gray-300 rounded-lg px-4 py-4 bg-gray-50">
              <input
                ref={picturesRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => set("pictures", Array.from(e.target.files ?? []))}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 w-full"
              />
              {form.pictures.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{form.pictures.length} file(s) selected</p>
              )}
            </div>
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errorMsg}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Submitting..." : "Submit Order"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
