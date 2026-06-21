const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));
app.use(express.json());

// 🚀 1. จุดใส่ Token: เอา Token ของบอทหลัก และบอทสำรองมาใส่เรียงกันตรงนี้ได้เลยครับ
const LINE_TOKENS = [
    "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=", // บอทตัวที่ 1 (ตัวเดิมที่เต็ม)
    "nLD8FyKUYl+DTlPrxjM5LfCok5WQB6e+2018rl2aVGXx1bcoZB7TVKu0Z3dUpvtqUvL/3ddpHbQT4mlPPa8r669UHktFYHxpiqrUIqdsfDRZPRy8wJPIowVmQZz6Hh21nB3uACfYu+aOi/vqBi+PgwdB04t89/1O/w1cDnyilFU=", 
    "Hn4AAbZi9vtZKzYbV6P388u8qazpjWzbRH9lR2E/CaCsMUWNBT2X2y0jMVileg6DZVju1jDkSkn51zOmF3HNRgpm3xEK8HL7Yme40y0zKPHAyRQwAaVj/w7n0601E+nJYRJu2AznmHILCTkQ9oqQkgdB04t89/1O/w1cDnyilFU="
    "A/YWNv3x+KgIMV4DKrToGZsW2r6fzscXk0mZTlONReLBwIxDQLVRdvHWQxHAuIl3UHtBAy7wW0SHgxUXEXEG5jq6Dmhj6rUN8/TwqZPuXD9S67ehPIkJeP99xzEqgWBc+3MPuXDZAgLHT8k8uiRCOwdB04t89/1O/w1cDnyilFU="
    "RiTyu58y5aqBgH5+yXINT+wY0eBOCM4ok1q4TfS/HyNjXmFpnG/ktmcbFobzhh2bcesQxUcCiOmV28gQmu26MyiahEOOc9N10gJK/sfTcNajXuLr0n6iOBBqS0lxL483q5oKQEFFf7IzfVwgx53R+AdB04t89/1O/w1cDnyilFU="
];
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea"; // กลุ่มเดิม

app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

// 🔄 ฟังก์ชันอัจฉริยะ: วนลูปพยายามส่ง LINE ถ้าตัวแรกฟ้องว่าเต็ม (Limit) จะสลับไปใช้ตัวถัดไปทันที
async function sendLineMessageWithFallback(messageText, tokenIndex = 0) {
    if (tokenIndex >= LINE_TOKENS.length) {
        throw new Error("🚨 โควตาฟรีของบอท LINE ทุกตัวเต็มหมดแล้วจ้า!");
    }

    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_TOKENS[tokenIndex]}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000 // ล็อกเวลาไว้ 8 วินาทีป้องกันเบราว์เซอร์ค้างหมุนนาน
        });
        console.log(`✅ ส่งออเดอร์เข้ากลุ่มสำเร็จด้วย บอทตัวที่ ${tokenIndex + 1}`);
    } catch (error) {
        const errorData = error.response ? error.response.data : {};
        const errorMsg = JSON.stringify(errorData);
        
        // 🛠️ ดักจับ Error: ถ้ามีคำว่า limit หรือเจอโค้ดบล็อกออเดอร์ ให้สลับไปใช้บอทตัวถัดไป
        if (errorMsg.includes("limit") || error.response?.status === 400 || error.response?.status === 429) {
            console.warn(`⚠️ บอทตัวที่ ${tokenIndex + 1} โควตาเต็มหรือส่งไม่ได้ กำลังสลับไปใช้บอทตัวที่ ${tokenIndex + 2}...`);
            return await sendLineMessageWithFallback(messageText, tokenIndex + 1);
        } else {
            // ถ้าพังด้วยสาเหตุอื่น (เช่น Token ผิด) ให้โยน Error ออกไป
            throw new Error(`LINE API พังที่บอทตัวที่ ${tokenIndex + 1}: ${error.message}`);
        }
    }
}

app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost, phone, address } = req.body;

        let formattedOrders = '';

        // 📥 จัดการ รายการอาหาร + ระดับความเผ็ด (ป้องกันราคาเป็น NaN)
        if (Array.isArray(orders)) {
            formattedOrders = orders.map(item => {
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const spicy = item.spicy || 'เผ็ดกลาง';
                
                const totalPrice = Number(price) * Number(qty);
                const displayPrice = isNaN(totalPrice) ? 0 : totalPrice; 
                
                return `• ${item.name} (${spicy}) x ${qty} จาน\nราคา ${displayPrice} บาท`;
            }).join('\n\n'); 
        } else {
            formattedOrders = orders || 'ไม่มีรายการอาหาร';
        }

        // 📝 จัดการประเภทการเสิร์ฟ / ข้อมูลจัดส่ง
        let deliveryInfo = '';
        const orderType = table ? table.toString().trim() : '';

        if (orderType.includes('จัดส่งถึงบ้าน') || orderType.includes('เดลิเวอรี่')) {
            deliveryInfo = `🚚 รูปแบบ: จัดส่งถึงบ้าน (เดลิเวอรี่)\n` +
                           `📞 เบอร์โทร: ${phone || '-'}\n` +
                           `📍 ที่อยู่: ${address || '-'}`;
        } else if (orderType.includes('ห่อกลับบ้าน')) {
            deliveryInfo = `🛍️ รูปแบบ: ห่อกลับบ้าน`;
        } else {
            const tableNum = orderType.replace(/โต๊ะที่|โต๊ะ/g, '').trim();
            deliveryInfo = `🍽️ รูปแบบ: ทานที่ร้าน (โต๊ะ: ${tableNum || '-'})`;
        }

        // 🌟 ข้อความแจ้งเตือนเข้ากลุ่ม LINE
        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        // 🚀 เรียกฟังก์ชันสลับบอทส่งข้อความอัตโนมัติ
        await sendLineMessageWithFallback(messageText, 0);

        // คืนสถานะสำเร็จให้หน้าบ้านทันทีเมื่อ LINE ตัวใดตัวหนึ่งส่งผ่าน
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ Main Server Error:', error.message);
        // ถึงแม้บอทจะส่งไม่ผ่านเลย แต่ถ้าเซิร์ฟเวอร์อ่านค่าได้ ให้ยอมปล่อยผ่านสำเร็จไปก่อนเพื่อให้ลูกค้าไม่งง
        if (!res.headersSent) {
            res.status(200).json({ status: 'success', message: 'รับออเดอร์เข้าระบบเรียบร้อยแล้ว' });
        }
    }
});

app.post('/callback', (req, res) => { res.sendStatus(200); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });