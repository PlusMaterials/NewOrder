"use client";

import { useState, useRef } from "react";

const TEAM_EMAILS = [
  "murad@plusmaterials.com",
  "zoeb@plusmaterials.com",
  "ali@plusmaterials.com",
  "ruby@plusmaterials.com",
  "sadaf@plusmaterials.com",
  "zubair@plusmaterials.com",
];

const LOGISTICS_EMAILS = [
  "rita@plusmaterials.com",
  "farida.lakhani@plusmaterials.com",
  "Sahil@plusmaterials.com",
  "sumera.kajani@plusmaterials.com",
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

interface FormData {
  buyingManager: string;
  salesRepresentative: string;
  secondaryAccountManagers: string[];
  logisticsManager: string;
  logisticsManagerOther: string;
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

const initialFormData: FormData = {
  buyingManager: "",
  salesRepresentative: "",
  secondaryAccountManagers: [],
  logisticsManager: "",
  logisticsManagerOther: "",
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
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const customerBookingRef = useRef<HTMLInputElement>(null);
  const customerPORef = useRef<HTMLInputElement>(null);
  const picturesRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (name: keyof FormData, value: string) => {
    setFormData((prev) => {
      const arr = prev[name] as string[];
      return {
        ...prev,
        [name]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "customerBooking" | "customerPO"
  ) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const handlePicturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setFormData((prev) => ({ ...prev, pictures: files }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setSubmitted(true);
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setSubmitted(false);
    if (customerBookingRef.current) customerBookingRef.current.value = "";
    if (customerPORef.current) customerPORef.current.value = "";
    if (picturesRef.current) picturesRef.current.value = "";
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Order Submitted</h2>
        <p className="text-gray-500 mb-6">Your new order has been successfully submitted.</p>
        <button
          onClick={handleReset}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Submit Another Order
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">New Order</h1>
          <p className="text-blue-100 text-sm mt-1">Plus Materials — Order Submission</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">

          {/* Buying Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buying Manager <span className="text-red-500">*</span>
            </label>
            <select
              name="buyingManager"
              value={formData.buyingManager}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a buying manager</option>
              {TEAM_EMAILS.map((email) => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>

          {/* Sales Representative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Representative <span className="text-red-500">*</span>
            </label>
            <select
              name="salesRepresentative"
              value={formData.salesRepresentative}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a sales representative</option>
              {TEAM_EMAILS.map((email) => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>

          {/* Secondary Account Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Account Manager
            </label>
            <div className="space-y-2">
              {TEAM_EMAILS.map((email) => (
                <label key={email} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.secondaryAccountManagers.includes(email)}
                    onChange={() => handleCheckbox("secondaryAccountManagers", email)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{email}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Logistics Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logistics Manager
            </label>
            <div className="space-y-2">
              {LOGISTICS_EMAILS.map((email) => (
                <label key={email} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="logisticsManager"
                    value={email}
                    checked={formData.logisticsManager === email}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{email}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="logisticsManager"
                  value="other"
                  checked={formData.logisticsManager === "other"}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Other</span>
              </label>
              {formData.logisticsManager === "other" && (
                <input
                  type="text"
                  name="logisticsManagerOther"
                  value={formData.logisticsManagerOther}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
                />
              )}
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select the Department <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {DEPARTMENTS.map((dept) => (
                <label key={dept} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="department"
                    value={dept}
                    checked={formData.department === dept}
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
            <input
              type="text"
              name="vendor"
              value={formData.vendor}
              onChange={handleChange}
              required
              placeholder="Enter vendor name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Place of Loading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Place of Loading (FOB Location)
            </label>
            <input
              type="text"
              name="placeOfLoading"
              value={formData.placeOfLoading}
              onChange={handleChange}
              placeholder="Enter FOB location"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Port / Ramp of Loading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PORT / RAMP of Loading
            </label>
            <input
              type="text"
              name="portRamp"
              value={formData.portRamp}
              onChange={handleChange}
              placeholder="Enter port or ramp"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Product / Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product / Grade <span className="text-red-500">*</span>
            </label>
            <select
              name="productGrade"
              value={formData.productGrade}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select product/grade</option>
              {PRODUCT_GRADES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* PO Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Items <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="poItems"
              value={formData.poItems}
              onChange={handleChange}
              required
              placeholder="Enter PO items"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pricing
            </label>
            <input
              type="text"
              name="pricing"
              value={formData.pricing}
              onChange={handleChange}
              placeholder="Enter pricing"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Customer Booking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Booking
            </label>
            <div className="border border-dashed border-gray-300 rounded-lg px-4 py-4 bg-gray-50">
              <input
                ref={customerBookingRef}
                type="file"
                onChange={(e) => handleFileChange(e, "customerBooking")}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 w-full"
              />
              {formData.customerBooking && (
                <p className="text-xs text-gray-500 mt-1">{formData.customerBooking.name}</p>
              )}
            </div>
          </div>

          {/* Customer PO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer PO
            </label>
            <div className="border border-dashed border-gray-300 rounded-lg px-4 py-4 bg-gray-50">
              <input
                ref={customerPORef}
                type="file"
                onChange={(e) => handleFileChange(e, "customerPO")}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 w-full"
              />
              {formData.customerPO && (
                <p className="text-xs text-gray-500 mt-1">{formData.customerPO.name}</p>
              )}
            </div>
          </div>

          {/* Minimum Loading Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Loading Weight <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="minimumLoadingWeight"
              value={formData.minimumLoadingWeight}
              onChange={handleChange}
              required
              placeholder="e.g. 20 MT"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* PO Shipping Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Shipping Terms
            </label>
            <select
              name="poShippingTerms"
              value={formData.poShippingTerms}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select shipping terms</option>
              {SHIPPING_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Final Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Destination <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="finalDestination"
              value={formData.finalDestination}
              onChange={handleChange}
              required
              placeholder="Enter final destination"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ICD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ICD
            </label>
            <input
              type="text"
              name="icd"
              value={formData.icd}
              onChange={handleChange}
              placeholder="Enter ICD"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Container Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Container Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="containerQuantity"
              value={formData.containerQuantity}
              onChange={handleChange}
              required
              placeholder="e.g. 5x40HC"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Target Ship Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Ship Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="targetShipDate"
              value={formData.targetShipDate}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-1">If no confirmed customer, please share tentative for SI</p>
            <input
              type="text"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              required
              placeholder="Enter customer name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <hr className="border-gray-100" />

          {/* SO Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SO Description
            </label>
            <input
              type="text"
              name="soDescription"
              value={formData.soDescription}
              onChange={handleChange}
              placeholder="Enter SO description"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* SO Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SO Price
            </label>
            <input
              type="text"
              name="soPrice"
              value={formData.soPrice}
              onChange={handleChange}
              placeholder="Enter SO price"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* SO QTY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SO QTY (Weights in MT)
            </label>
            <input
              type="text"
              name="soQty"
              value={formData.soQty}
              onChange={handleChange}
              placeholder="e.g. 100 MT"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms
            </label>
            <select
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select payment terms</option>
              {PAYMENT_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={4}
              placeholder="Any additional information..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Pictures */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pictures
            </label>
            <div className="border border-dashed border-gray-300 rounded-lg px-4 py-4 bg-gray-50">
              <input
                ref={picturesRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePicturesChange}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 w-full"
              />
              {formData.pictures.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {formData.pictures.length} file(s) selected
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit Order
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
