"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

interface VendorSuggestion {
  vendor: string;
  email: string;
}

const TEAM_MEMBERS = [
  { name: "Murad", email: "murad@plusmaterials.com" },
  { name: "Zoeb", email: "zoeb@plusmaterials.com" },
  { name: "Ali", email: "ali@plusmaterials.com" },
  { name: "Ruby", email: "ruby@plusmaterials.com" },
  { name: "Sadaf", email: "sadaf@plusmaterials.com" },
  { name: "Zubair", email: "zubair@plusmaterials.com" },
];

const LOGISTICS_MEMBERS = [
  { name: "Sumera (Export Manager)", email: "sumera.kajani@plusmaterials.com" },
  { name: "Rita (Export North)", email: "rita@plusmaterials.com" },
  { name: "Sahil (Export South)", email: "Sahil@plusmaterials.com" },
  { name: "Farida (Domestic)", email: "farida.lakhani@plusmaterials.com" },
];

const DOMESTIC_LOGISTICS_EMAIL = "farida.lakhani@plusmaterials.com";

const DEPARTMENTS = ["Plus", "PRN", "PRN SE", "Walton"];

const PRODUCT_GRADES = [
  "Plastic job lot",
  "Paper job lot",
  "Waste and Scrap of Paper",
  "Waste and Scrap of Plastic",
];

const SHIPPING_TERMS_EXPORT = ["FOB", "FAS", "CIF"];
const SHIPPING_TERMS_DOMESTIC = ["FOB", "Delivered"];

const DOMESTIC_DESTINATIONS = [
  "PRN SE",
  "Walton Logistics",
  "Plus Savannah",
  "Swift Chicago",
  "Ryder Chicago",
  "Atlantic New Jersey",
  "Other",
];

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
  vendorContactEmail: string;
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
  finalDestinationOther: string;
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
  vendorContactEmail: "",
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
  finalDestinationOther: "",
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

// Tappable file upload button — renders a styled button that triggers a hidden input
function FileUploadButton({
  id,
  inputRef,
  accept,
  multiple,
  capture,
  onChange,
  label,
}: {
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  multiple?: boolean;
  capture?: "environment" | "user";
  onChange: (files: FileList | null) => void;
  label: string;
}) {
  return (
    <>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        className="sr-only"
        onChange={(e) => onChange(e.target.files)}
      />
      <label
        htmlFor={id}
        className="flex items-center justify-center gap-2 w-full cursor-pointer rounded-lg border border-dashed border-gray-300 bg-gray-50 py-4 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors touch-manipulation select-none"
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3 3m3-3 3 3M4.5 19.5h15a1.5 1.5 0 0 0 0-3H18l-1.5-3H7.5L6 16.5H4.5a1.5 1.5 0 0 0 0 3Z" />
        </svg>
        {label}
      </label>
    </>
  );
}

export default function NewOrderForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [trackingNumber, setTrackingNumber] = useState<number | null>(null);
  const [vendorSuggestions, setVendorSuggestions] = useState<VendorSuggestion[]>([]);
  const [exportDestinations, setExportDestinations] = useState<string[]>([]);
  const [domesticOtherDestinations, setDomesticOtherDestinations] = useState<string[]>([]);
  const customerBookingRef = useRef<HTMLInputElement>(null);
  const customerPORef = useRef<HTMLInputElement>(null);
  const picturesRef = useRef<HTMLInputElement>(null);

  const isDomestic = form.logisticsManager === DOMESTIC_LOGISTICS_EMAIL;
  // Hide sales/customer fields when a fixed domestic destination is chosen (not "Other")
  const hideCustomerSection =
    isDomestic &&
    form.finalDestination !== "" &&
    form.finalDestination !== "Other";

  useEffect(() => {
    const allowed = isDomestic ? SHIPPING_TERMS_DOMESTIC : SHIPPING_TERMS_EXPORT;
    setForm((prev) => ({
      ...prev,
      poShippingTerms:
        prev.poShippingTerms && !allowed.includes(prev.poShippingTerms) ? "" : prev.poShippingTerms,
      finalDestination: "",
      finalDestinationOther: "",
    }));
  }, [isDomestic]);

  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => (res.ok ? res.json() : { vendors: [] }))
      .then((data) => setVendorSuggestions(data.vendors ?? []))
      .catch(() => setVendorSuggestions([]));
  }, []);

  useEffect(() => {
    fetch("/api/destinations")
      .then((res) => (res.ok ? res.json() : { destinations: [], domesticOther: [] }))
      .then((data) => {
        setExportDestinations(data.destinations ?? []);
        setDomesticOtherDestinations(data.domesticOther ?? []);
      })
      .catch(() => {
        setExportDestinations([]);
        setDomesticOtherDestinations([]);
      });
  }, []);

  const set = (field: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => set(e.target.name as keyof FormState, e.target.value);

  const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const match = vendorSuggestions.find(
      (v) => v.vendor.toLowerCase() === value.trim().toLowerCase()
    );
    setForm((prev) => ({
      ...prev,
      vendor: value,
      vendorContactEmail: match?.email ? match.email : prev.vendorContactEmail,
    }));
  };

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
      fd.append("vendorContactEmail", form.vendorContactEmail);
      fd.append("placeOfLoading", form.placeOfLoading);
      fd.append("portRamp", isDomestic ? "" : form.portRamp);
      fd.append("productGrade", isDomestic ? "" : form.productGrade);
      fd.append("poItems", form.poItems);
      fd.append("pricing", form.pricing);
      fd.append("minimumLoadingWeight", form.minimumLoadingWeight);
      fd.append("poShippingTerms", form.poShippingTerms);
      const resolvedDestination =
        isDomestic && form.finalDestination === "Other"
          ? form.finalDestinationOther
          : form.finalDestination;
      fd.append("finalDestination", resolvedDestination);
      fd.append("icd", isDomestic ? "" : form.icd);
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
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium touch-manipulation"
        >
          Submit Another Order
        </button>
      </div>
    );
  }

  // Tall inputs for comfortable touch interaction
  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation";

  // Full-row label wrapper for checkboxes/radios — entire row is tappable
  const checkRowCls = "flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation -mx-3";

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 flex items-center gap-3">
          <img src="/logo.png" alt="Plus Materials" className="h-10 w-auto flex-shrink-0" />
          <h1 className="text-xl font-bold text-white flex-1">New Order Form</h1>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-blue-200 hover:text-white text-xs font-medium transition-colors touch-manipulation py-2 px-1"
          >
            Sign out
          </button>
        </div>

        <form id="order-form" onSubmit={handleSubmit} className="px-5 py-6 space-y-6">

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Account Manager</label>
            <div className="space-y-0.5">
              {TEAM_MEMBERS.map((m) => (
                <label key={m.email} className={checkRowCls}>
                  <input
                    type="checkbox"
                    checked={form.secondaryAccountManagers.includes(m.email)}
                    onChange={() => toggleCheckbox(m.email)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Logistics Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logistics Manager</label>
            <div className="space-y-0.5">
              {LOGISTICS_MEMBERS.map((m) => (
                <label key={m.email} className={checkRowCls}>
                  <input
                    type="radio"
                    name="logisticsManager"
                    value={m.email}
                    checked={form.logisticsManager === m.email}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{m.name}</span>
                </label>
              ))}
              <label className={checkRowCls}>
                <input
                  type="radio"
                  name="logisticsManager"
                  value="other"
                  checked={form.logisticsManager === "other"}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">Other</span>
              </label>
              {form.logisticsManager === "other" && (
                <div className="ml-8 space-y-2 pt-1">
                  <input
                    type="text"
                    name="logisticsManagerOtherName"
                    value={form.logisticsManagerOtherName}
                    onChange={handleChange}
                    placeholder="Full name"
                    autoComplete="off"
                    className={inputCls}
                  />
                  <input
                    type="email"
                    name="logisticsManagerOtherEmail"
                    value={form.logisticsManagerOtherEmail}
                    onChange={handleChange}
                    placeholder="Email address"
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select the Department <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {DEPARTMENTS.map((dept) => (
                <label key={dept} className={checkRowCls}>
                  <input
                    type="radio"
                    name="department"
                    value={dept}
                    checked={form.department === dept}
                    onChange={handleChange}
                    required
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
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
              value={form.vendor}
              onChange={handleVendorChange}
              required
              list="vendor-suggestions"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              placeholder="Enter vendor name"
              className={inputCls}
            />
            <datalist id="vendor-suggestions">
              {vendorSuggestions.map((v) => (
                <option key={v.vendor} value={v.vendor} />
              ))}
            </datalist>
          </div>

          {/* Vendor Contact Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Contact Email</label>
            <input
              type="email"
              name="vendorContactEmail"
              value={form.vendorContactEmail}
              onChange={handleChange}
              placeholder="vendor@example.com"
              autoComplete="off"
              autoCapitalize="none"
              className={inputCls}
            />
          </div>

          {/* Product / Grade — hidden for domestic shipments */}
          {!isDomestic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product / Grade <span className="text-red-500">*</span>
              </label>
              <select name="productGrade" value={form.productGrade} onChange={handleChange} required className={inputCls}>
                <option value="">Select product/grade</option>
                {PRODUCT_GRADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {/* Purchase Order Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Order Items <span className="text-red-500">*</span>
            </label>
            <textarea name="poItems" value={form.poItems} onChange={handleChange} required placeholder="Enter purchase order items" className={`${inputCls} resize-none min-h-[88px]`} />
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pricing</label>
            <textarea name="pricing" value={form.pricing} onChange={handleChange} placeholder="Enter pricing" className={`${inputCls} resize-none min-h-[88px]`} />
          </div>

          {/* Minimum Loading Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Loading Weight <span className="text-red-500">*</span>
            </label>
            <input type="text" name="minimumLoadingWeight" value={form.minimumLoadingWeight} onChange={handleChange} required placeholder="e.g. 20 MT" inputMode="text" className={inputCls} />
          </div>

          {/* Purchase Order Shipping Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order Shipping Terms</label>
            <select name="poShippingTerms" value={form.poShippingTerms} onChange={handleChange} className={inputCls}>
              <option value="">Select shipping terms</option>
              {(isDomestic ? SHIPPING_TERMS_DOMESTIC : SHIPPING_TERMS_EXPORT).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Place of Loading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Place of Loading</label>
            <input type="text" name="placeOfLoading" value={form.placeOfLoading} onChange={handleChange} placeholder="Enter FOB location" autoCapitalize="words" className={inputCls} />
          </div>

          {/* Port / Ramp — hidden for domestic shipments */}
          {!isDomestic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Export Port / Ramp</label>
              <input type="text" name="portRamp" value={form.portRamp} onChange={handleChange} placeholder="Enter export port or ramp" autoCapitalize="words" className={inputCls} />
            </div>
          )}

          {/* Final Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Destination <span className="text-red-500">*</span>
            </label>
            {isDomestic ? (
              <div className="space-y-2">
                <select
                  name="finalDestination"
                  value={form.finalDestination}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="">Select destination</option>
                  {DOMESTIC_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {form.finalDestination === "Other" && (
                  <div>
                    <input
                      type="text"
                      name="finalDestinationOther"
                      value={form.finalDestinationOther}
                      onChange={handleChange}
                      required
                      list="past-destinations"
                      autoComplete="off"
                      autoCapitalize="words"
                      placeholder="Enter destination"
                      className={inputCls}
                    />
                    <datalist id="past-destinations">
                      {domesticOtherDestinations.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  name="finalDestination"
                  value={form.finalDestination}
                  onChange={handleChange}
                  required
                  list="export-destinations"
                  autoComplete="off"
                  autoCapitalize="words"
                  placeholder="Enter final destination"
                  className={inputCls}
                />
                <datalist id="export-destinations">
                  {exportDestinations.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </>
            )}
          </div>

          {/* ICD — hidden for domestic shipments */}
          {!isDomestic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ICD</label>
              <input type="text" name="icd" value={form.icd} onChange={handleChange} placeholder="Enter ICD" autoCapitalize="words" className={inputCls} />
            </div>
          )}

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

          {!hideCustomerSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <p className="text-xs text-gray-400 mb-1">If no confirmed customer, please share tentative for SI</p>
              <input type="text" name="customer" value={form.customer} onChange={handleChange} placeholder="Enter customer name" autoCapitalize="words" className={inputCls} />
            </div>
          )}

          {!hideCustomerSection && <hr className="border-gray-100" />}

          {!hideCustomerSection && (
            <>
              {/* Sales Order Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order Description</label>
                <textarea name="soDescription" value={form.soDescription} onChange={handleChange} placeholder="Enter sales order description" className={`${inputCls} resize-none min-h-[88px]`} />
              </div>

              {/* Sales Order Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order Price</label>
                <textarea name="soPrice" value={form.soPrice} onChange={handleChange} placeholder="Enter sales order price" className={`${inputCls} resize-none min-h-[88px]`} />
              </div>

              {/* Sales Order QTY */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order QTY (Weights in MT)</label>
                <input type="text" name="soQty" value={form.soQty} onChange={handleChange} placeholder="e.g. 100 MT" inputMode="text" className={inputCls} />
              </div>
            </>
          )}

          {!hideCustomerSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className={inputCls}>
                <option value="">Select payment terms</option>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Additional Notes — always visible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={form.additionalNotes}
              onChange={handleChange}
              placeholder="Any additional information..."
              className={`${inputCls} resize-none min-h-[100px]`}
            />
          </div>

          <hr className="border-gray-100" />

          {!hideCustomerSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Booking</label>
              <FileUploadButton
                id="customerBooking"
                inputRef={customerBookingRef}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                onChange={(files) => set("customerBooking", files?.[0] ?? null)}
                label={form.customerBooking ? form.customerBooking.name : "Tap to choose file"}
              />
            </div>
          )}

          {/* Customer PO */}
          {!hideCustomerSection && <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer PO</label>
            <FileUploadButton
              id="customerPO"
              inputRef={customerPORef}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={(files) => set("customerPO", files?.[0] ?? null)}
              label={form.customerPO ? form.customerPO.name : "Tap to choose file"}
            />
          </div>}

          {/* Pictures */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pictures</label>
            <div className="space-y-2">
              {/* Camera shortcut for mobile */}
              <FileUploadButton
                id="picturesCamera"
                inputRef={{ current: null }}
                accept="image/*"
                capture="environment"
                onChange={(files) => {
                  if (!files) return;
                  setForm((prev) => ({ ...prev, pictures: [...prev.pictures, ...Array.from(files)] }));
                }}
                label="Take photo"
              />
              {/* Files + photo library */}
              <FileUploadButton
                id="picturesLibrary"
                inputRef={picturesRef}
                accept="image/*,application/pdf"
                multiple
                onChange={(files) => {
                  if (!files) return;
                  setForm((prev) => ({ ...prev, pictures: [...prev.pictures, ...Array.from(files)] }));
                }}
                label="Choose from files or photo library"
              />
            </div>
            {form.pictures.length > 0 && (
              <div className="mt-2 space-y-1">
                {form.pictures.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-xs text-gray-600">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, pictures: prev.pictures.filter((_, j) => j !== i) }))}
                      className="ml-2 text-gray-400 hover:text-red-500 touch-manipulation flex-shrink-0"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errorMsg}</p>
          )}

          {/* Spacer so content isn't hidden behind sticky button */}
          <div className="h-2" />

        </form>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            type="submit"
            form="order-form"
            disabled={status === "submitting"}
            className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-semibold text-base hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
          >
            {status === "submitting" ? "Submitting…" : "Submit Order"}
          </button>
        </div>
      </div>

    </div>
  );
}
