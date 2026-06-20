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

// 🕵️ ฟังก์ชันอัจฉริยะ แกะจำนวนจานมาคิดราคารายบรรทัดแยกตามที่พี่ต้องการ
function appendPriceToItem(lineText) {
    let text = lineText.trim();
    if (!text) return '';

    // ลบสัญลักษณ์ขีด "-" ข้างหน้าออกชั่วคราวเพื่อเคลียร์ข้อความ
    let cleanText = text.replace(/^-\s*/, '').trim();

    // ดึงจำนวนจานจากข้อความ (ดักจับตัวเลขหลังตัว x หรือก่อนคำว่า จาน)
    let quantity = 1; 
    let matchQty = cleanText.match(/x\s*(\d+)/) || cleanText.match(/(\d+)\s*จาน/);
    if (matchQty) {
        quantity = parseInt(matchQty[1]);
    }

    // ลบคำว่า "x X จาน" ออกจากชื่อเมนูชั่วคราว เพื่อเอาชื่อเมนูล้วน ๆ ไปหากลุ่มราคา
    let menuName = cleanText.replace(/x\s*\d+\s*จาน/, '').replace(/x\s*\d+/, '').replace(/\d+\s*จาน/, '').trim();

    let pricePerUnit = 60; // ค่าเริ่มต้นถ้าไม่ตรงกับเมนูไหนเลย

    // 1. กลุ่มเมนูใหญ่ / (L) / ตำถาด -> จานละ 350 บาท
    if (cleanText.includes('ใหญ่') || cleanText.includes('(L)') || cleanText.includes('ตำถาด')) {
        pricePerUnit = 350;
    }
    // 2. กลุ่มเมนูแซลมอนปกติ -> จานละ 299 บาท
    else if (cleanText.includes('แซลมอน')) {
        pricePerUnit = 299;
    }
    // 3. กลุ่มเมนูเหลา หรือ เมนูระบุชัดเจนว่า (พิเศษ) บางตัว -> จานละ 150 บาท
    else if (cleanText.includes('เหลา') || cleanText.includes('หมึกกรอบ (พิเศษ)')) {
        pricePerUnit = 150;
    }
    // 4. กลุ่มเมนูของทอด / ยำโบราณ -> จานละ 80 บาท
    else if (cleanText.includes('แดดเดียว') || cleanText.includes('ยำหนังหมู') || cleanText.includes('เนื้อ')) {
        pricePerUnit = 80;
    }
    // 5. ตำซั่ว (พิเศษ) ตามตัวอย่างของพี่ -> จานละ 50 บาท
    else if (cleanText.includes('ตำซั่ว (พิเศษ)')) {
        pricePerUnit = 50;
    }
    // 6. กลุ่มส้มตำทั่วไป / ตำซั่วปกติ / (ธรรมดา) -> จานละ 60 บาท
    else if (cleanText.includes('(ธรรมดา)') || cleanText.includes('ตำซั่ว') || cleanText.includes('ส้มตำ')) {
        pricePerUnit = 60;
    }
    // 7. กลุ่มข้าว / ไข่ดาว -> จานละ 50 บาท
    else if (cleanText.includes('ข้าว') || cleanText.includes('ไข่ดาว')) {
        pricePerUnit = 50;
    }

    // คำนวณราคารวมของบรรทัดนั้น
    let totalPriceForItem = pricePerUnit * quantity;

    // ส่งข้อความกลับไปในรูปแบบ: - [ชื่อเมนู] จานละ [ราคา] x [จำนวน] จาน [ราคา [รวม] บาท]
    return `- ${menuName} จานละ ${pricePerUnit} x ${quantity} จาน [ราคา ${totalPriceForItem} บาท]`;
}

// 🛍️ ด่านรับออเดอร์เข้าครัว
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        let formattedOrders = '';

        if (Array.isArray(orders)) {
            // รองรับส่งมาเป็นโครงสร้างข้อมูล Array
            formattedOrders = orders.map(item => {
                return appendPriceToItem(`${item.name} x ${item.quantity} จาน`);
            }).join('\n');
        } else if (typeof orders === 'string') {
            // รองรับแกะจากข้อความดิบรวมยาว ๆ แยกบรรทัดให้เองอัตโนมัติ
            formattedOrders = orders.split('\n')
                .map(line => appendPriceToItem(line))
                .filter(line => line !== '' && !line.includes('-  จานละ'))
                .join('\n');
        }

        // จัดอาร์ตเวิร์กข้อความยิงเข้า LINE ใหม่เอี่ยมตามบรีฟพี่เป๊ะ ๆ
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

        console.log(`✅ [SUCCESS] ออเดอร์โต๊ะ ${table} แสดงราคาแยกจานละเอียดเรียบร้อย!`);
        res.status(200).json({ status: 'success', message: 'ส่งออเดอร์สำเร็จ' });

    } catch (error) {
        console.error('❌ ข้อผิดพลาดหลังบ้าน:', error.message);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดภายในระบบหลังบ้าน' });
    }
});

app.post('/callback', (req, res) => {
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 [SERVER ONLINE] หลังบ้านร้านแซ่บลืมผัว สแตนด์บายที่พอร์ต: ${PORT}`);
});