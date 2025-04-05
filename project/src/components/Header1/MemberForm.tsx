/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase URL or anon key");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// FIXED: Removed async from component function declaration
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

  // Track if fields have been manually edited
  const [editedFields, setEditedFields] = useState({
    billingAmount: false,
    pendingAmount: false
  });

  // Fetch the latest member ID when component mounts
  useEffect(() => {
    const fetchLatestMemberId = async () => {
      try {
        const { data, error } = await supabase
          .from("members")
          .select("member_id")
          .order("member_id", { ascending: false })
          .limit(1);
        
        if (error) {
          console.error("Error fetching latest member ID:", error);
          return;
        }
        
        if (data && data.length > 0) {
          // Get the latest ID and increment it
          const latestId = data[0].member_id;
          const nextId = (parseInt(latestId) + 1).toString();
          
          // Set the next member ID
          setFormData(prev => ({
            ...prev,
            memberId: nextId
          }));
        } else {
          // No existing members, start from 1001
          setFormData(prev => ({
            ...prev,
            memberId: "1001"
          }));
        }
      } catch (err) {
        console.error("Error generating member ID:", err);
      }
    };

    fetchLatestMemberId();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;
    
    // Track if billing amount or pending amount has been manually edited
    if (name === "billingAmount" || name === "pendingAmount") {
      setEditedFields(prev => ({
        ...prev,
        [name]: true
      }));
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  useEffect(() => {
    calculateBillingDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.memberPack,
    formData.discountAmount,
    formData.tax,
    formData.registrationFee,
    formData.billingAmount
  ]);

  const calculateBillingDetails = () => {
    let totalMonthsPaid = 0;
    let packAmount = 0;
    
    // Set months and amount based on membership pack
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

    // Calculate total amount
    let totalAmount = packAmount;
    
    // Apply discount (only once)
    const discount = parseFloat(formData.discountAmount) || 0;
    if (discount > 0) {
      totalAmount -= discount;
    }

    // Apply tax
    const taxRate = parseFloat(formData.tax) || 0;
    if (taxRate > 0) {
      const taxedAmount = (taxRate / 100) * totalAmount;
      totalAmount += taxedAmount;
    }
    
    // Add registration fee if any
    const regFee = parseFloat(formData.registrationFee) || 0;
    if (regFee > 0) {
      totalAmount += regFee;
    }

    // Parse billing amount (what customer is paying now)
    const billingAmount = parseFloat(formData.billingAmount) || 0;
    
    // Calculate pending amount (only if not manually edited)
    let pendingAmount = parseFloat(formData.pendingAmount) || 0;
    if (!editedFields.pendingAmount) {
      pendingAmount = Math.max(0, totalAmount - billingAmount);
    }

    // Update form data with calculated values
    setFormData(prevFormData => ({
      ...prevFormData,
      totalMonthPaid: totalMonthsPaid.toString(),
      packAmount: packAmount.toString(),
      totalAmount: totalAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2)
    }));
  };

  // Check if current date is a new day or month compared to the last update
  const checkForDateChange = (lastUpdatedDate: string | null): { isNewDay: boolean; isNewMonth: boolean } => {
    if (!lastUpdatedDate) return { isNewDay: false, isNewMonth: false };

    const now = new Date();
    const lastUpdate = new Date(lastUpdatedDate);
    
    // Check if it's a new day
    const isNewDay = 
      now.getDate() !== lastUpdate.getDate() || 
      now.getMonth() !== lastUpdate.getMonth() ||
      now.getFullYear() !== lastUpdate.getFullYear();
    
    // Check if it's a new month
    const isNewMonth = 
      now.getMonth() !== lastUpdate.getMonth() ||
      now.getFullYear() !== lastUpdate.getFullYear();
    
    return { isNewDay, isNewMonth };
  };

  // Create a metrics record if one doesn't exist
  const createMetricsRecord = async (billingAmount: number): Promise<boolean> => {
    try {
      console.log("Creating new metrics record in stat_card");
      
      // Create initial metrics record
      const { error } = await supabase
        .from("stat_card")
        .insert({
          sno: 1,
          collected_month: billingAmount.toString(),
          collected_today: billingAmount.toString(),
          trans_done: "1",
          last_updated: new Date().toISOString()
        });
      
      if (error) {
        console.error("Error creating metrics record:", error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error in createMetricsRecord:", err);
      return false;
    }
  };

  // Update metrics record with new transaction
  const updateMetricsRecord = async (billingAmount: number): Promise<boolean> => {
    try {
      console.log(`New member payment metrics update: amount = ${billingAmount}`);
      
      // First try to create the stat_card table if it doesn't exist
      try {
        await supabase.rpc('create_stat_card_table_if_not_exists');
      } catch (e) {
        console.log("Table might already exist or error:", e);
      }

      // Fetch current metrics
      const { data, error } = await supabase
        .from("stat_card")
        .select("*")
        .eq("sno", 1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching current metrics:", error);
        
        // Try to create the record if it doesn't exist
        if (error.code === 'PGRST116') {
          return await createMetricsRecord(billingAmount);
        }
        return false;
      }
      
      if (!data) {
        // Create new record if none exists
        return await createMetricsRecord(billingAmount);
      }
      
      // Check for day/month change and reset if needed
      const { isNewDay, isNewMonth } = checkForDateChange(data.last_updated);
      const today = new Date().toISOString();
      
      // Parse current values to numbers
      let collectedMonth = parseFloat(data.collected_month || "0");
      let collectedToday = parseFloat(data.collected_today || "0");
      let transactionsDone = parseInt(data.trans_done || "0");
      
      // Reset values if needed based on date change
      if (isNewDay) {
        console.log("Resetting daily metrics - new day detected");
        collectedToday = 0;
        transactionsDone = 0;
      }
      
      if (isNewMonth) {
        console.log("Resetting monthly metrics - new month detected");
        collectedMonth = 0;
      }
      
      // Add the new billing amount
      collectedMonth += billingAmount;
      collectedToday += billingAmount;
      transactionsDone += 1;
      
      console.log(`Member form metrics update: month=${collectedMonth}, today=${collectedToday}, transactions=${transactionsDone}`);
      
      // Update the record
      const { error: updateError } = await supabase
        .from("stat_card")
        .update({
          collected_month: collectedMonth.toString(),
          collected_today: collectedToday.toString(),
          trans_done: transactionsDone.toString(),
          last_updated: today
        })
        .eq("sno", 1);
      
      if (updateError) {
        console.error("Error updating metrics:", updateError);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error in updateMetricsRecord:", err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const memberId = formData.memberId;

      // Insert into members table
      const { error: memberError } = await supabase
        .from("members")
        .insert({
          member_id: memberId,
          sno: memberId,
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
          bill_date: formData.billDate,
          member_address: formData.memberAddress,
          member_phone_number: formData.memberPhoneNumber,
          member_type: formData.memberPack,
          trainer: formData.selectTrainer,
        });

      if (memberError) throw memberError;

      // Calculate amount paid now
      const totalAmount = parseFloat(formData.totalAmount);
      const pendingAmount = parseFloat(formData.pendingAmount);
      const paidNow = totalAmount - pendingAmount;

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
          total_paid: paidNow.toFixed(2),
          renewal_date: formData.pendingDate,
          month_paid: formData.totalMonthPaid,
          state: pendingAmount > 0 ? (paidNow > 0 ? "Partially Paid" : "Pending") : "Paid"
        });

      if (transactionError) throw transactionError;

      // Update stat_card metrics with the new payment
      const billingAmount = parseFloat(formData.billingAmount) || 0;
      await updateMetricsRecord(billingAmount);

      toast.success("Member and transaction added successfully!");

      // Fetch the next member ID after successful submission
      const { data } = await supabase
        .from("members")
        .select("member_id")
        .order("member_id", { ascending: false })
        .limit(1);
      
      const nextId = data && data.length > 0 ? 
        (parseInt(data[0].member_id) + 1).toString() : "1001";
      
      // Reset form with the new member ID
      setFormData({
        memberId: nextId,
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
      
      // Reset edited fields tracking
      setEditedFields({
        billingAmount: false,
        pendingAmount: false
      });
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Failed to add member and transaction: " + error.message);
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
            <label style={labelStyle}>Member ID* (Auto-generated)</label>
            <input
              type="text"
              name="memberId"
              value={formData.memberId}
              style={{...inputStyle, backgroundColor: "#f0f0f0"}}
              readOnly
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
              style={{...inputStyle, backgroundColor: "#f8f8f8"}}
              readOnly
            />
            <label style={labelStyle}>Discount Amount</label>
            <input
              type="number"
              name="discountAmount"
              value={formData.discountAmount}
              onChange={handleInputChange}
              placeholder="Enter Discount Amount"
              style={inputStyle}
            />
            <label style={labelStyle}>
              Pending Amount {editedFields.pendingAmount ? "(Manually Edited)" : "(Auto-calculated)"}
            </label>
            <input
              type="number"
              name="pendingAmount"
              value={formData.pendingAmount}
              onChange={handleInputChange}
              placeholder="Pending Amount"
              style={{
                ...inputStyle,
                backgroundColor: editedFields.pendingAmount ? "#fff3cd" : "#f8f8f8"
              }}
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
              style={{...inputStyle, backgroundColor: "#f8f8f8"}}
              readOnly
            />
            <label style={labelStyle}>
              Billing Amount* {editedFields.billingAmount ? "(Manually Edited)" : ""}
            </label>
            <input
              type="number"
              name="billingAmount"
              value={formData.billingAmount}
              onChange={handleInputChange}
              placeholder="Enter Billing Amount"
              style={{
                ...inputStyle,
                backgroundColor: editedFields.billingAmount ? "#fff3cd" : "#ffffff"
              }}
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
              style={{...inputStyle, backgroundColor: "#f8f8f8"}}
              readOnly
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
            <label style={labelStyle}>Emergency Phone Number</label>
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
          {editedFields.pendingAmount && (
            <button
              type="button"
              onClick={() => {
                setEditedFields(prev => ({...prev, pendingAmount: false}));
                calculateBillingDetails();
              }}
              style={{
                padding: "8px 15px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              Recalculate Pending Amount
            </button>
          )}
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