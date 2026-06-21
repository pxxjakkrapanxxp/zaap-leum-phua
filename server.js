const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

app.post('/api/order', async (req, res) => {
    try {
        // รับค่าเพิ่ม: phone (เบอร์โทร), address (ที่อยู่) จากหน้าบ้านเดลิเวอรี่
        const { customer, table, orders, totalCost, phone, address } = req.body;

        let formattedOrders = '';

        // 📥 จัดการ รายการอาหาร + ระดับความเผ็ด
        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                const price = item.price || 0;
                const qty = item.quantity || 1;
                // ดึงค่าความเผ็ด (ถ้าหน้าบ้านส่งมาเป็น item.spicy ถ้าไม่มีให้ใส่ เผ็ดกลาง เป็น default)
                const spicy = item.spicy || 'เผ็ดกลาง';
                
                // รูปแบบ: • [เมนู] ([ความเผ็ด]) x [จำนวน] จาน \n ราคา [ราคา] บาท
                return `• ${item.name} (${spicy}) x ${qty} จาน\nราคา ${price * qty} บาท`;
            }).join('\n\n'); 
        } else {
            formattedOrders = orders;
        }

        // 📝 จัดการประเภทการเสิร์ฟ / ข้อมูลจัดส่ง
        let deliveryInfo = '';
        if (table === 'จัดส่งถึงบ้าน' || table === 'เดลิเวอรี่') {
            deliveryInfo = `🚚 รูปแบบ: จัดส่งถึงบ้าน (เดลิเวอรี่)\n` +
                           `📞 เบอร์โทร: ${phone || '-'}\n` +
                           `📍 ที่อยู่: ${address || '-'}`;
        } else if (table === 'ห่อกลับบ้าน') {
            deliveryInfo = `🛍️ รูปแบบ: ห่อกลับบ้าน`;
        } else {
            // กรณีทานที่ร้าน เคลียร์คำว่า "โต๊ะที่" ซ้ำซ้อนออก
            const tableNum = table.includes('โต๊ะที่') ? table.replace('โต๊ะที่ ', '') : table;
            deliveryInfo = `🍽️ รูปแบบ: ทานที่ร้าน (โต๊ะ: ${tableNum})`;
        }

        // 🌟 ข้อความอาร์ตเวิร์กแจ้งเตือนเข้ากลุ่ม LINE 
        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        // ส่ง Push Message เข้ากลุ่ม LINE
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดในการส่งออเดอร์' });
    }
});

app.post('/callback', (req, res) => { res.sendStatus(200); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });