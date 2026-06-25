


import express from 'express';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import productRoutes from './routes/productRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import salesReturnRoutes from './routes/salesReturnRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import cors from "cors";




const app = express();


app.use(express.json());
app.use(express.urlencoded({extended: false})); // process form data HTML forms in a simple format
app.use(cookieParser());
app.use(cors());


app.get('/', (req, res) => {
  res.send('Welcome to BrosBrew API');
});


app.use('/api/v1/users', userRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', salesRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/returns', salesReturnRoutes);
app.use('/api/v1/receipts', receiptRoutes);
app.use('/api/v1/invoices', invoiceRoutes);


app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT || 3000}`);
});


export default app;