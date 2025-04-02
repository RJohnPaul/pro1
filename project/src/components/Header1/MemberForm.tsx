import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase URL or anon key");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MemberForm = () => {
  const [formData, setFormData] = useState({
    memberId: "",
    memberName: "",
    billDate: "",
    memberJoiningDate: "",
    memberDob: "",
    memberPhoneNumber: "",
    memberEmail: "",
    gender: "",
    identityDocumentType: "",
    documentIdNumber: "",
    memberAddress: "",
    paymentMode: "",
    referredBy: "",
    selectImage: null,
    memberPack: "",
    packAmount: "",
    discountAmount: "0",
    pendingAmount: "0",
    pendingDate: "",
    selectTrainer: "",
    bloodGroup: "",
    weight: "",
    totalMonthPaid: "",
    billingAmount: "",
    registrationFee: "0",
    totalAmount: "",
    tax: "0",
    selectDiet: "",
    height: "",
    emergencyPhoneNumber: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;
    setFormData({
      ...formData,
      [name]: files ? files[0] : value,
    });
  };

  useEffect(() => {
    const calculateBillingDetails = () => {
      let totalMonthsPaid = 0;
      const billingAmount = parseFloat(formData.billingAmount) || 0;
      let packAmount = 0;

      switch (formData.memberPack) {
      case "Quaterly":
        totalMonthsPaid = 3;
        packAmount = 7500;
        break;
      case "Half-yearly":
        totalMonthsPaid = 6;
        packAmount = 12000;
        break;
      case "Monthly":
        totalMonthsPaid = 1;
        packAmount = 3500;
        break;
      case "Annual":
        totalMonthsPaid = 12;
        packAmount = 18000;
        break;
      case "2 Months":
        totalMonthsPaid = 2;
        packAmount = 5000;
        break;
      case "4 Months":
        totalMonthsPaid = 4;
        packAmount = 7800;
        break;
      case "12 + 2 Months":
        totalMonthsPaid = 14;
        packAmount = 18000;
        break;
      case "6 + 1 Month":
        totalMonthsPaid = 7;
        packAmount = 9000;
        break;
      default:
        totalMonthsPaid = 0;
        packAmount = 0;
      }

      let totalAmount = packAmount;

      if (parseFloat(formData.discountAmount) > 0) {
      totalAmount -= parseFloat(formData.discountAmount);
      }

      if (parseFloat(formData.tax) > 0) {
      const taxed = (parseFloat(formData.tax) / 100) * totalAmount;
      totalAmount += taxed;
      }

      if (parseFloat(formData.discountAmount) > 1) {
      totalAmount -= parseFloat(formData.discountAmount);
      }

      if (parseFloat(formData.tax) > 1) {
      const taxed = (parseFloat(formData.tax) / 100) * totalAmount;
      totalAmount += taxed;
      }

      const pendingAmount = totalAmount - (billingAmount - parseFloat(formData.discountAmount || "0"));

      setFormData((prevFormData) => ({
      ...prevFormData,
      totalMonthPaid: totalMonthsPaid.toString(),
      billingAmount: billingAmount.toString(),
      packAmount: packAmount.toString(),
      totalAmount: totalAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
      }));
    };
  
    calculateBillingDetails();
  }, [formData.memberPack, formData.discountAmount, formData.tax]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const memberId = formData.memberId;

      // Insert into members table
      const { error: memberError } = await supabase
        .from("members")
        .insert({
          member_id: memberId,
          sno : memberId,
          member_name: formData.memberName,
          dob: formData.memberDob,
          member_email: formData.memberEmail,
          identity_document_type: formData.identityDocumentType,
          address: formData.memberAddress,
          referred_by: formData.referredBy,
          gender: formData.gender,
          document_id_number: formData.documentIdNumber,
          payment_mode: formData.paymentMode,
          member_joining_date: formData.memberJoiningDate,
          bill_date : formData.billDate,
          member_address: formData.memberAddress,
          member_phone_number: formData.memberPhoneNumber,
          member_type: formData.memberPack,
          trainer: formData.selectTrainer,
        });

      if (memberError) throw memberError;

      // Insert into transactions table
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          sno: memberId,
          emp_id: memberId,
          member_name: formData.memberName,
          bill_date: formData.billDate,
          start_date: formData.memberJoiningDate,
          phone: formData.memberPhoneNumber,
          payment_mode: formData.paymentMode,
          member_type: formData.memberPack,
          discount: formData.discountAmount,
          pending: formData.pendingAmount,
          total_amount_received: formData.totalAmount,
          total_paid: (parseFloat(formData.totalAmount) - parseFloat(formData.pendingAmount)).toFixed(2),
          renewal_date: formData.pendingDate,
          month_paid: formData.totalMonthPaid,
        });

      if (transactionError) throw transactionError;

      toast.success("Member and transaction added successfully!");
      setFormData({
        memberId: "",
        memberName: "",
        billDate: "",
        memberJoiningDate: "",
        memberDob: "",
        memberPhoneNumber: "",
        memberEmail: "",
        gender: "",
        identityDocumentType: "",
        documentIdNumber: "",
        memberAddress: "",
        paymentMode: "",
        referredBy: "",
        selectImage: null,
        memberPack: "",
        packAmount: "",
        discountAmount: "0",
        pendingAmount: "0",
        pendingDate: "",
        selectTrainer: "",
        bloodGroup: "",
        weight: "",
        totalMonthPaid: "",
        billingAmount: "",
        registrationFee: "0",
        totalAmount: "",
        tax: "0",
        selectDiet: "",
        height: "",
        emergencyPhoneNumber: "",
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error("Failed to add member and transaction: " + errorMessage);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginBottom: "15px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "13px",
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <ToastContainer />
      <h2
        style={{
          textAlign: "center",
          padding: 10,
          marginBottom: "30px",
          fontWeight: "bold",
          fontSize: 18,
          borderBottom: "1px solid #ccc",
        }}
      >
        Member & Transaction Details
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {/* Column 1 */}
          <div>
            <label style={labelStyle}>Member ID*</label>
            <input
              type="text"
              name="memberId"
              value={formData.memberId}
              onChange={handleInputChange}
              placeholder="Enter Member ID"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Member Name*</label>
            <input
              type="text"
              name="memberName"
              value={formData.memberName}
              onChange={handleInputChange}
              placeholder="Enter Member Name"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Member DOB*</label>
            <input
              type="date"
              name="memberDob"
              value={formData.memberDob}
              onChange={handleInputChange}
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Member Email</label>
            <input
              type="email"
              name="memberEmail"
              value={formData.memberEmail}
              onChange={handleInputChange}
              placeholder="Enter Email"
              style={inputStyle}
            />
            <label style={labelStyle}>Identity document type</label>
            <select
              name="identityDocumentType"
              value={formData.identityDocumentType}
              onChange={handleInputChange}
              style={inputStyle}
            >
              <option value="">----</option>
              <option value="Aadhar card">Aadhar card</option>
              <option value="PAN card">PAN card</option>
              <option value="Electoral Photo Identity card">Electoral Photo Identity card</option>
              <option value="Indian Passport">Indian Passport</option>
              <option value="Driving license">Driving license</option>
            </select>
            <label style={labelStyle}>Member Address</label>
            <textarea
              name="memberAddress"
              value={formData.memberAddress}
              onChange={handleInputChange}
              placeholder="Enter Address"
              rows={4}
              style={{ ...inputStyle, resize: "none" }}
            ></textarea>
            <label style={labelStyle}>Referred By</label>
            <input
              type="text"
              name="referredBy"
              value={formData.referredBy}
              onChange={handleInputChange}
              placeholder="Referred By"
              style={inputStyle}
            />
            <label style={labelStyle}>Upload Image</label>
            <input type="file" name="selectImage" onChange={handleInputChange} style={inputStyle} />
          </div>

          {/* Column 2 */}
          <div>
            <label style={labelStyle}>Bill Date*</label>
            <input
              type="date"
              name="billDate"
              value={formData.billDate}
              onChange={handleInputChange}
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Joining Date*</label>
            <input
              type="date"
              name="memberJoiningDate"
              value={formData.memberJoiningDate}
              onChange={handleInputChange}
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Phone Number*</label>
            <input
              type="tel"
              name="memberPhoneNumber"
              value={formData.memberPhoneNumber}
              onChange={handleInputChange}
              placeholder="Enter Phone Number"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              style={inputStyle}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Transgender</option>
            </select>
            <label style={labelStyle}>Document ID Number</label>
            <input
              type="text"
              name="documentIdNumber"
              value={formData.documentIdNumber}
              onChange={handleInputChange}
              placeholder="Enter Document ID Number"
              style={inputStyle}
            />
            <label style={labelStyle}>Payment Mode*</label>
            <select
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleInputChange}
              style={inputStyle}
              required
            >
              <option value="">----</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="POS">POS</option>
              <option value="Gpay">Gpay</option>
              <option value="Paytm">Paytm</option>
              <option value="Amazon Pay">Amazon Pay</option>
              <option value="Netbanking">Netbanking</option>
            </select>

            <label style={labelStyle}>Blood Group</label>
            <input
              type="text"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleInputChange}
              placeholder="Enter Blood Group"
              style={inputStyle}
            />
          </div>

          {/* Column 3 */}
          <div>
            <label style={labelStyle}>Member Pack*</label>
            <select
              name="memberPack"
              value={formData.memberPack}
              onChange={handleInputChange}
              style={inputStyle}
              required
            >
              <option value="">----</option>
              <option value="Quaterly">Quaterly</option>
              <option value="Half-yearly">Half-yearly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
              <option value="2 Months">2 Months</option>
              <option value="4 Months">4 Months</option>
              <option value="12 + 2 Months">12 + 2 Months</option>
              <option value="6 + 1 Month">6 + 1 Month</option>
            </select>
            <label style={labelStyle}>Pack Amount*</label>
            <input
              type="number"
              name="packAmount"
              value={formData.packAmount}
              onChange={handleInputChange}
              placeholder="Enter Pack Amount"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Discount Amount*</label>
            <input
              type="number"
              name="discountAmount"
              value={formData.discountAmount}
              onChange={handleInputChange}
              placeholder="Enter Discount Amount"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Pending Amount</label>
            <input
              type="number"
              name="pendingAmount"
              value={formData.pendingAmount}
              onChange={handleInputChange}
              placeholder="Pending Amount"
              style={inputStyle}
            />
            <label style={labelStyle}>Pending Date</label>
            <input
              type="date"
              name="pendingDate"
              value={formData.pendingDate}
              onChange={handleInputChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Select Trainer</label>
            <input
              type="text"
              name="selectTrainer"
              value={formData.selectTrainer}
              onChange={handleInputChange}
              placeholder="Select Trainer"
              style={inputStyle}
            />
            <label style={labelStyle}>Weight</label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="Enter Weight"
              style={inputStyle}
            />
          </div>

          {/* Column 4 */}
          <div>
            <label style={labelStyle}>Total Months Paid*</label>
            <input
              type="number"
              name="totalMonthPaid"
              value={formData.totalMonthPaid}
              onChange={handleInputChange}
              placeholder="Total Months Paid"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Billing Amount*</label>
            <input
              type="number"
              name="billingAmount"
              value={formData.billingAmount}
              onChange={handleInputChange}
              placeholder="Enter Billing Amount"
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Registration Fee</label>
            <input
              type="number"
              name="registrationFee"
              value={formData.registrationFee}
              onChange={handleInputChange}
              placeholder="Enter Registration Fee"
              style={inputStyle}
            />
            <label style={labelStyle}>Total Amount</label>
            <input
              type="number"
              name="totalAmount"
              value={formData.totalAmount}
              onChange={handleInputChange}
              placeholder="Enter Total Amount"
              style={inputStyle}
            />
            <label style={labelStyle}>Tax (%)</label>
            <input
              type="number"
              name="tax"
              value={formData.tax}
              onChange={handleInputChange}
              placeholder="Enter Tax (%)"
              style={inputStyle}
            />
            <label style={labelStyle}>Select Diet</label>
            <select
              name="selectDiet"
              value={formData.selectDiet}
              onChange={handleInputChange}
              style={inputStyle}
            >
              <option value="">Select Diet</option>
              <option value="Veg">Veg</option>
              <option value="Non-Veg">Non-Veg</option>
              <option value="Vegan">Vegan</option>
            </select>
            <label style={labelStyle}>Height</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleInputChange}
              placeholder="Enter Height"
              style={inputStyle}
            />
            <label style={labelStyle}>Emergency Phone Number*</label>
            <input
              type="tel"
              name="emergencyPhoneNumber"
              value={formData.emergencyPhoneNumber}
              onChange={handleInputChange}
              placeholder="Enter Emergency Phone Number"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              backgroundColor: "#2485bd",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Proceed
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;