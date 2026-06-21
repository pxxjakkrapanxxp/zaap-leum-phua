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

// 🚀 1. [จุดแก้ไขสำคัญ]: ใส่คู่ Token และ ID กลุ่มใหม่ทั้ง 5 กลุ่มให้ตรงกันครับ 
// (แก้ Syntax Error ลืมใส่เครื่องหมายคอมมาเรียบร้อยแล้วครับ)
const LINE_BOT_CONFIGS = [
    {
        token: "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=", 
        groupId: "Caf6de425fc6bacbf9afd71c27ffef7ea" // 📦 กลุ่มที่ 1 (กลุ่มเดิมที่โควตาบอทแรกเต็ม)
    },
    {
        token: "nLD8FyKUYl+DTlPrxjM5LfCok5WQB6e+2018rl2aVGXx1bcoZB7TVKu0Z3dUpvtqUvL/3ddpHbQT4mlPPa8r669UHktFYHxpiqrUIqdsfDRZPRy8wJPIowVmQZz6Hh21nB3uACfYu+aOi/vqBi+PgwdB04t89/1O/w1cDnyilFU=", 
        groupId: "วาง_GROUP_ID_ของกลุ่มใหม่ที่_2_ตรงนี้" // 📦 กลุ่มที่ 2
    },
    {
        token: "Hn4AAbZi9vtZKzYbV6P388u8qazpjWzbRH9lR2E/CaCsMUWNBT2X2y0jMVileg6DZVju1jDkSkn51zOmF3HNRgpm3xEK8HL7Yme40y0zKPHAyRQwAaVj/w7n0601E+nJYRJu2AznmHILCTkQ9oqQkgdB04t89/1O/w1cDnyilFU=", 
        groupId: "วาง_GROUP_ID_ของกลุ่มใหม่ที่_3_ตรงนี้" // 📦 กลุ่มที่ 3
    },
    {
        token: "A/YWNv3x+KgIMV4DKrToGZsW2r6fzscXk0mZTlONReLBwIxDQLVRdvHWQxHAuIl3UHtBAy7wW0SHgxUXEXEG5jq6Dmhj6rUN8/TwqZPuXD9S67ehPIkJeP99xzEqgWBc+3MPuXDZAgLHT8k8uiRCOwdB04t89/1O/w1cDnyilFU=", 
        groupId: "วาง_GROUP_ID_ของกลุ่มใหม่ที่_4_ตรงนี้" // 📦 กลุ่มที่ 4
    },
    {
        token: "RiTyu58y5aqBgH5+yXINT+wY0eBOCM4ok1q4TfS/HyNjXmFpnG/ktmcbFobzhh2bcesQxUcCiOmV28gQmu26MyiahEOOc9N10gJK/sfTcNajXuLr0n6iOBBqS0lxL483q5oKQEFFf7IzfVwgx53R+AdB04t89/1O/w1cDnyilFU=", 
        groupId: "วาง_GROUP_ID_ของกลุ่มใหม่ที่_5_ตรงนี้" // 📦 กลุ่มที่ 5
    }
];

app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

// 🔄 ฟังก์ชันสลับกลุ่มอัจฉริยะ: ดักจับลิมิตบอทเก่า แล้วสลับยิงเข้ากลุ่มของบอทตัวใหม่ให้ทันที
async function sendLineMessageWithFallback(messageText, botIndex = 0) {
    if (botIndex >= LINE_BOT_CONFIGS.length) {
        throw new Error("🚨 โควตาฟรีของบอท LINE ทุกกลุ่มเต็มหมดแล้วจ้า!");
    }

    const currentBot = LINE_BOT_CONFIGS[botIndex];

    // ป้องกันกรณีที่ยังก๊อปปี้ ID กลุ่มใหม่มาวางไม่ครบ ระบบจะได้ข้ามไปตัวที่พร้อมทำงานก่อนได้ลื่นไหล
    if (!currentBot.groupId || currentBot.groupId.includes("วาง_GROUP")) {
        console.warn(`⚠️ บอทกลุ่มที่ ${botIndex + 1} ยังไม่ได้ใส่ Group ID ข้ามไปสลับตัวถัดไป...`);
        return await sendLineMessageWithFallback(messageText, botIndex + 1);
    }

    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: currentBot.groupId, // ยิงตรงหาไอดีกลุ่มของบอทตัวนั้นๆ
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${currentBot.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
        console.log(`✅ ส่งออเดอร์เข้ากลุ่มสำเร็จด้วย บอทกลุ่มที่ ${botIndex + 1}`);
    } catch (error) {
        const errorData = error.response ? error.response.data : {};
        const errorMsg = JSON.stringify(errorData);
        
        // 🛠️ ตรวจจับ Error ลิมิตโควตาเต็ม หรือยิงไม่ผ่าน -> ย้ายไปส่งกลุ่มลำดับถัดไปทันที
        if (errorMsg.includes("limit") || error.response?.status === 400 || error.response?.status === 429) {
            console.warn(`⚠️ บอth กลุ่มที่ ${botIndex + 1} โควตาเต็มแล้ว กำลังสลับไปส่งที่ บอทกลุ่มที่ ${botIndex + 2}...`);
            return await sendLineMessageWithFallback(messageText, botIndex + 1);
        } else {
            throw new Error(`LINE API พังที่กลุ่มลำดับที่ ${botIndex + 1}: ${error.message}`);
        }
    }
}

app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost, phone, address } = req.body;
        let formattedOrders = '';

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

        let deliveryInfo = '';
        const orderType = table ? table.toString().trim() : '';

        if (orderType.includes('จัดส่งถึงบ้าน') || orderType.includes('เดลิเวอรี่')) {
            deliveryInfo = `🚚 รูปแบบ: จัดส่งถึงบ้าน (เดลิเวอรี่)\n📞 เบอร์โทร: ${phone || '-'}\n📍 ที่อยู่: ${address || '-'}`;
        } else if (orderType.includes('ห่อกลับบ้าน')) {
            deliveryInfo = `🛍️ รูปแบบ: ห่อกลับบ้าน`;
        } else {
            const tableNum = orderType.replace(/โต๊ะที่|โต๊ะ/g, '').trim();
            deliveryInfo = `🍽️ รูปแบบ: ทานที่ร้าน (โต๊ะ: ${tableNum || '-'})`;
        }

        const messageText = `📥 ออเดอร์ใหม่เข้าแล้วจ้า! 🔥🌶️\n\n` +
                            `${deliveryInfo}\n` +
                            `👤 ลูกค้า: คุณ ${customer}\n\n` +
                            `📝 [ รายการอาหาร ]\n` +
                            `${formattedOrders}\n\n` +
                            `💰 ยอดสุทธิรวม: ${totalCost} บาท\n` +
                            `================🔥`;

        // สั่งทำงานระบบวนลูปกระจายกลุ่มแชร์โควตา
        await sendLineMessageWithFallback(messageText, 0);

        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ Main Server Error:', error.message);
        if (!res.headersSent) {
            res.status(200).json({ status: 'success', message: 'รับออเดอร์เข้าระบบเรียบร้อยแล้ว' });
        }
    }
});

app.post('/callback', (req, res) => { res.sendStatus(200); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });