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

// 🕵️ ฟังก์ชันแกะรายละเอียดออเดอร์และคิดราคาต่อจานตามจริงแบบอัตโนมัติ
function parseOrderLine(lineText) {
    let text = lineText.trim();
    if (!text) return '';

    // ลบสัญลักษณ์ขีด "-" ข้างหน้าออกเพื่อความสะอาดของข้อมูล
    let cleanText = text.replace(/^-\s*/, '').trim();

    // 1. ดึงจำนวนจาน (หาตัวเลขหลังตัว x หรือตัวเลขก่อนคำว่า จาน)
    let quantity = 1;
    let matchQty = cleanText.match(/x\s*(\d+)/) || cleanText.match(/(\d+)\s*จาน/);
    if (matchQty) {
        quantity = parseInt(matchQty[1]);
    }

    // ลบคำว่า "x X จาน" ออกจากข้อความชั่วคราว เพื่อหาชื่อเมนูและออปชัน
    let itemDetails = cleanText.replace(/x\s*\d+\s*จาน/, '').replace(/x\s*\d+/, '').replace(/\d+\s*จาน/, '').trim();

    // 2. คำนวณราคาต่อจานแบบฉลาดและยืดหยุ่นตามระดับราคาของร้านพี่ (ธรรมดา/พิเศษ/ใหญ่)
    let pricePerUnit = 60; // ราคามาตรฐานเริ่มต้นของเมนูส้มตำทั่วไป

    // ⚡ กรณีกลุ่มเมนูใหญ่ / (L) / ตำถาด -> จานละ 350 บาท
    if (itemDetails.includes('ใหญ่') || itemDetails.includes('(L)') || itemDetails.includes('ตำถาด')) {
        pricePerUnit = 350;
    }
    // ⚡ กรณีเมนูแซลมอนพรีเมียม -> จานละ 299 บาท
    else if (itemDetails.includes('แซลมอน')) {
        pricePerUnit = 299;
    }
    // ⚡ กรณีกลุ่มเมนูเหลาต่างๆ -> จานละ 150 บาท
    else if (itemDetails.includes('เหลา')) {
        pricePerUnit = 150;
    }
    // ⚡ กรณีเมนูพิเศษอื่นๆ เช่น หมึกกรอบ (พิเศษ) -> จานละ 150 บาท
    else if (itemDetails.includes('หมึกกรอบ (พิเศษ)')) {
        pricePerUnit = 150;
    }
    // ⚡ เช็กออปชันเฉพาะ: ถ้าเป็นเมนูระบุ "(พิเศษ)" และเป็นประเภทตำทั่วไป (เช่น ตำหมูยอ พิเศษ, ตำซั่ว พิเศษ) -> ขยับขึ้นเป็นจานละ 80 บาท
    else if (itemDetails.includes('(พิเศษ)') && (itemDetails.includes('ตำ') || itemDetails.includes('ยำ'))) {
        pricePerUnit = 80;
    }
    // ⚡ เช็กออปชันเฉพาะ: ถ้าเป็นเมนูระบุ "(ธรรมดา)" เช่น ตำหมูยอ (ธรรมดา), ตำซั่ว (ธรรมดา) -> จานละ 60 บาท
    else if (itemDetails.includes('(ธรรมดา)') || itemDetails.includes('ตำหมูยอ') || itemDetails.includes('ตำซั่ว')) {
        pricePerUnit = 60;
    }
    // ⚡ กลุ่มเมนูของทอด / ของทานเล่น -> จานละ 80 บาท
    else if (itemDetails.includes('แดดเดียว') || itemDetails.includes('ยำหนังหมู') || itemDetails.includes('เนื้อ')) {
        pricePerUnit = 80;
    }
    // ⚡ กลุ่มข้าว / ไข่ดาว -> จานละ 50 บาท
    else if (itemDetails.includes('ข้าว') || itemDetails.includes('ไข่ดาว')) {
        pricePerUnit = 50;
    }

    // คำนวณราคารวมเฉพาะเมนูนั้นๆ
    let totalPriceForItem = pricePerUnit * quantity;

    // ส่งข้อความกลับในรูปแบบที่พี่ต้องการเป๊ะ ๆ
    return `- ${itemDetails} จานละ ${pricePerUnit} x ${quantity} จาน [ราคา ${totalPriceForItem} บาท]`;
}

// 🛍️ ด่านรับออเดอร์ส่งเข้าแชทร้าน
app.post('/api/order', async (req, res) => {
    try {
        const { customer, table, orders, totalCost } = req.body;

        let formattedOrders = '';

        if (Array.isArray(orders)) {
            // ถ้าระบบส่งข้อมูลมาเป็น Array โครงสร้างข้อมูลย่อย
            formattedOrders = orders.map(item => {
                return parseOrderLine(`${item.name} x ${item.quantity} จาน`);
            }).join('\n');
        } else if (typeof orders === 'string') {
            // ถ้าระบบส่งมาเป็นข้อความดิบรวมยาว ๆ (แยกบรรทัดให้อัตโนมัติและจัดระเบียบราคาใหม่หมด)
            formattedOrders = orders.split('\n')
                .map(line => parseOrderLine(line))
                .filter(line => line !== '' && !line.includes('-  จานละ'))
                .join('\n');
        }

        // 🌟 รูปแบบข้อความเด้งเข้าไลน์กลุ่มตรงตามบรีฟเป๊ะ ๆ 🌟
        const messageText = `🔥 มีออเดอร์ใหม่เข้าครัว! 🔥\n` +
                            `📌 หมายเลขโต๊ะ: ${table.includes('โต๊ะที่') ? table : 'โต๊ะที่ ' + table}\n` +
                            `👤 ชื่อลูกค้า: คุณ ${customer}\n` +
                            `-------------------------\n` +
                            `${formattedOrders}\n` +
                            `-------------------------\n` +
                            `💰 ยอดสุทธิ: ${totalCost} บาท`;

        // ส่งข้อความแจ้งเตือนยิงเข้า LINE
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: LINE_TARGET_GROUP_ID,
            messages: [{ type: 'text', text: messageText }]
        }, {
            headers: {
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ [SUCCESS] ออเดอร์โต๊ะ ${table} อัปเดตราคาแบบละเอียดเรียบร้อย!`);
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
    console.log(`🚀 [SERVER ONLINE] หลังบ้านร้านแซ่บลืมผัว พร้อมรับออเดอร์ราคาใหม่ที่พอร์ต: ${PORT}`);
});