const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// 🔑 Token LINE OA ร้านแซ่บลืมผัวของพี่
const LINE_ACCESS_TOKEN = "D9ExQrK4/2l62hPuPvnrxJnsNUoRogzAJTYQL8Tzr3U38WBPwJcUf26DceTDkG+qNSuJBVEI5E6d6z4qBcr5VOkwwN3wwk8IeWRc/agLjJzKTrG6S4Nren2ZBV4K5P9GeUg45AOA8VBFFY4hHfquXQdB04t89/1O/w1cDnyilFU=";

// 🆔 รหัสกลุ่มของพี่
const LINE_TARGET_GROUP_ID = "Caf6de425fc6bacbf9afd71c27ffef7ea";

// 🕵️ ฟังก์ชันดักจับขนาดเมนู เพื่อต่อท้ายราคาแต่ละรายการให้พ่อครัวดูปริมาณ
function appendPriceToItem(lineText) {
    let text = lineText.trim();
    if (!text) return '';

    // ลบสัญลักษณ์ขีด "-" ข้างหน้าออกชั่วคราวเพื่อเอาไปเช็กคำ
    let cleanText = text.replace(/^-\s*/, '').trim();

    // 1. ตรวจจับกลุ่มเมนู "ใหญ่" หรือ "(L)" หรือ "ตำถาด" -> ราคา 350 บาท
    if (cleanText.includes('ใหญ่') || cleanText.includes('(L)') || cleanText.includes('ตำถาด')) {
        return `- ${cleanText} [ราคา 350 บาท]`;
    }

    // 2. ตรวจจับคำว่า "แซลมอน" (จานปกติ) -> ราคา 299 บาท
    if (cleanText.includes('แซลมอน')) {
        return `- ${cleanText} [ราคา 299 บาท]`;
    }

    // 3. ตรวจจับกลุ่มเมนูประเภทเหลา หรือประเภทโชว์คำว่า "(พิเศษ)" -> ราคา 150 บาท
    if (cleanText.includes('(พิเศษ)') || cleanText.includes('เหลา')) {
        return `- ${cleanText} [ราคา 150 บาท]`;
    }

    // 4. ตรวจจับกลุ่มเมนูของทอด / ยำ / ของทานเล่น -> ราคา 80 บาท
    if (cleanText.includes('แดดเดียว') || cleanText.includes('ยำหนังหมู') || cleanText.includes('เนื้อ')) {
        return `- ${cleanText} [ราคา 80 บาท]`;
    }

    // 5. ตรวจจับกลุ่มส้มตำทั่วไปที่เป็นคำว่า "(ธรรมดา)" หรือตำปกติ -> ราคา 60 บาท
    if (cleanText.includes('(ธรรมดา)') || cleanText.includes('ตำซั่ว') || cleanText.includes('ส้มตำ')) {
        return `- ${cleanText} [ราคา 60 บาท]`;
    }

    // 6. ตรวจจับกลุ่มข้าว / ไข่ดาว -> ราคา 50 บาท
    if (cleanText.includes('ข้าว') || cleanText.includes('ไข่ดาว')) {
        return `- ${cleanText} [ราคา 50 บาท]`;
    }

    // ถ้าไม่ตรงกับเงื่อนไขด้านบนเลย ให้ส่งบรรทัดเดิมกลับไป
    return text.startsWith('-') ? text : `- ${text}`;
}

// 🛍️ ด่านรับออเดอร์เข้าครัว
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        let formattedOrders = '';

        if (Array.isArray(orders)) {
            // รองรับถ้าหน้าร้านส่งข้อมูลมาเป็นรูปแบบโครงสร้างอ็อบเจกต์ (Array)
            formattedOrders = orders.map(item => {
                return appendPriceToItem(`${item.name} x ${item.quantity} จาน`);
            }).join('\n');
        } else if (typeof orders === 'string') {
            // รองรับการแกะข้อความยาวๆ แยกบรรทัด แล้วต่อท้ายราคาให้ทีละบรรทัดอัตโนมัติ
            formattedOrders = orders.split('\n')
                .map(line => appendPriceToItem(line))
                .filter(line => line !== '- ' && line !== '')
                .join('\n');
        }

        // 🌟 หน้าตาข้อความที่จะเด้งเข้ากลุ่ม LINE แบบที่พี่ต้องการเป๊ะ ๆ 🌟
        const messageText = `🔥 มีออเดอร์ใหม่เข้าครัว! 🔥\n` +
                            `📌 หมายเลขโต๊ะ: ${table.includes('โต๊ะที่') ? table : 'โต๊ะที่ ' + table}\n` +
                            `👤 ชื่อลูกค้า: คุณ ${customer}\n` +
                            `-------------------------\n` +
                            `${formattedOrders}\n` +
                            `-------------------------\n` +
                            `💰 ยอดสุทธิ: ${totalCost} บาท`;

        // สั่งยิงข้อความเข้าไลน์กลุ่มร้าน
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ [SUCCESS] ออเดอร์โต๊ะ ${table} ห้อยราคาหลังรายการเรียบร้อยแล้ว!`);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ ข้อผิดพลาดของระบบ:', error.message);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดภายในหลังบ้าน' });
    }
});

app.post('/callback', (req, res) => {
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [SERVER ONLINE] ระบบเปิดสแตนด์บายรับออเดอร์ที่พอร์ต: ${PORT}`);
});