document.addEventListener('DOMContentLoaded', () => {
    const infoBox = document.getElementById('info-box');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const content = document.getElementById('content');
    const passwordContainer = document.getElementById('password-container');

    passwordSubmit.addEventListener('click', () => {
        const password = passwordInput.value;
        fetch('check_password.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `password=${password}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                passwordContainer.style.display = 'none';
                content.style.display = 'flex';
            } else {
                alert('비밀번호가 틀렸습니다.');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    let currentMemoPopup = null;

    const gradePriority = {
        'S': 1,
        'A': 2,
        'B': 3,
        'C': 4,
        'D': 5,
        '정보 미입력': 6
    };

    const moveTypePriority = {
        '익스프레스': 1,
        '완포': 2,
        '포장이사(이모x)': 3,
        '반포장이사': 4,
        '일반이사': 5,
        '정보 미입력': 6
    };

    const regionNameMapping = {
        'seoul': '서울',
        'busan': '부산',
        'daegu': '대구',
        'incheon': '인천',
        'gwangju': '광주',
        'daejeon': '대전',
        'ulsan': '울산',
        'sejong': '세종',
        'gyeonggi': '경기',
        'gangwon': '강원',
        'chungbuk': '충북',
        'chungnam': '충남',
        'jeonbuk': '전북',
        'jeonnam': '전남',
        'gyeongbuk': '경북',
        'gyeongnam': '경남',
        'jeju': '제주'
    };

    const moveTypeClassMapping = {
        '익스프레스': 'express',
        '완포': 'wanpo',
        '포장이사(이모x)': 'packing',
        '반포장이사': 'semi-packing',
        '일반이사': 'general',
        '정보 미입력': 'no-info'
    };

    const gradeColorMapping = {
        'S': '#ff7e7e',  // 빨간색
        'A': '#ffff78',  // 노란색
        'B': '#ffd152',  // 초록색
        'C': '#4f60ff',  // 파란색
        'D': '#5e5e5e',  // 회색
        '정보 미입력': '#f9f9f9'  // 기본 색상
    };

    function showMemoPopup(memo) {
        if (currentMemoPopup) {
            document.body.removeChild(currentMemoPopup);
        }

        const memoPopup = document.createElement('div');
        memoPopup.id = 'memo-popup';
        memoPopup.innerHTML = `
            <div class="memo-popup-content">
                <span class="memo-close-btn">&times;</span>
                <p>${memo}</p>
            </div>
        `;
        document.body.appendChild(memoPopup);
        currentMemoPopup = memoPopup;

        const closeBtn = memoPopup.querySelector('.memo-close-btn');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(memoPopup);
            currentMemoPopup = null;
        });

        memoPopup.addEventListener('click', (e) => {
            if (e.target === memoPopup) {
                document.body.removeChild(memoPopup);
                currentMemoPopup = null;
            }
        });

        document.addEventListener('click', (e) => {
            if (currentMemoPopup && !memoPopup.contains(e.target) && e.target.className !== 'memo-field') {
                document.body.removeChild(memoPopup);
                currentMemoPopup = null;
            }
        }, { once: true });
    }

    async function loadExcelData() {
        try {
            const response = await fetch('articles.xlsx?timestamp=' + new Date().getTime());
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = json[0];
            json.splice(0, 1); // Remove headers

            const regions = {};

            for (let rowIndex = 0; rowIndex < json.length; rowIndex++) {
                const row = json[rowIndex];
                const regionId = row[headers.indexOf('ID')];
                const regionName = row[headers.indexOf('Name')];

                if (regionId === 'END') {
                    break;
                }

                if (!regionId || !regionName) {
                    continue;
                }

                let tonValue = row[headers.indexOf('Ton')] || '정보 미입력';
                if (!isNaN(tonValue)) {
                    tonValue += '톤';
                }

                const article = {
                    name: regionName,
                    phone: row[headers.indexOf('Phone')] || '정보 미입력',
                    carNum: row[headers.indexOf('CarNum')] || '정보 미입력',
                    ton: tonValue,
                    carType: row[headers.indexOf('CarType')] || '정보 미입력',
                    moveType: row[headers.indexOf('MoveType')] || '정보 미입력',
                    available: row[headers.indexOf('Available')] || '정보 미입력',
                    grade: row[headers.indexOf('Grade')] || '정보 미입력',
                    memo: row[headers.indexOf('Memo')] || '정보 미입력'
                };

                if (!regions[regionId]) {
                    regions[regionId] = { name: regionNameMapping[regionId], articles: [] };
                }
                regions[regionId].articles.push(article);
            }

            Object.keys(regions).forEach(regionId => {
                const region = regions[regionId];
                // 등급, 이사 종류, 톤수 순으로 정렬
                region.articles.sort((a, b) => {
                    const gradeA = gradePriority[a.grade] || gradePriority['정보 미입력'];
                    const gradeB = gradePriority[b.grade] || gradePriority['정보 미입력'];
                    if (gradeA !== gradeB) return gradeA - gradeB;

                    const moveTypeA = moveTypePriority[a.moveType] || moveTypePriority['정보 미입력'];
                    const moveTypeB = moveTypePriority[b.moveType] || moveTypePriority['정보 미입력'];
                    if (moveTypeA !== moveTypeB) return moveTypeA - moveTypeB;

                    const tonA = parseFloat(a.ton.replace(/[^0-9.]/g, '')) || 0;
                    const tonB = parseFloat(b.ton.replace(/[^0-9.]/g, '')) || 0;
                    return tonB - tonA;
                });

                const regionElement = document.getElementById(regionId);
                if (regionElement) {
                    regionElement.addEventListener('click', () => {
                        let articlesHtml = '<div class="article-container">';
                        region.articles.forEach(article => {
                            const moveTypeClass = moveTypeClassMapping[article.moveType];
                            const gradeColor = gradeColorMapping[article.grade];
                            articlesHtml += `
                                <div class="article ${moveTypeClass}">
                                    <div class="article-field">${article.name}</div>
                                    <div class="article-field">${article.phone}</div>
                                    <div class="article-field">${article.carNum}</div>
                                    <div class="article-field">${article.ton}</div>
                                    <div class="article-field">${article.carType}</div>
                                    <div class="article-field">${article.moveType}</div>
                                    <div class="article-field">${article.available}</div>
                                    <div class="article-field" style="background-color: ${gradeColor};">${article.grade}</div>
                                    <div class="article-field memo-field" data-memo="${article.memo}">메모 보기</div>
                                </div>
                            `;
                        });
                        articlesHtml += '</div>';

                        infoBox.innerHTML = `
                            <div class="info-box-header">
                                <h2>${region.name}</h2>
                                <button id="close-btn">&times;</button>
                            </div>
                            <div class="article-header">
                                <div class="article-field"><strong>기사 이름</strong></div>
                                <div class="article-field"><strong>핸드폰 번호</strong></div>
                                <div class="article-field"><strong>차량 번호</strong></div>
                                <div class="article-field"><strong>톤수</strong></div>
                                <div class="article-field"><strong>차량 종류</strong></div>
                                <div class="article-field"><strong>이사 종류</strong></div>
                                <div class="article-field"><strong>가용 대수</strong></div>
                                <div class="article-field"><strong>등급</strong></div>
                                <div class="article-field"><strong>추가 메모</strong></div>
                            </div>
                            ${articlesHtml}
                        `;
                        infoBox.style.display = 'block';

                        document.querySelectorAll('.memo-field').forEach(memoField => {
                            memoField.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const memo = e.currentTarget.getAttribute('data-memo');
                                showMemoPopup(memo);
                            });
                        });

                        document.getElementById('close-btn').addEventListener('click', () => {
                            infoBox.style.display = 'none';
                        });
                    });
                } else {
                    console.warn(`Element not found for region: ${regionId}`);
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.region') && !e.target.closest('#info-box') && !e.target.closest('#memo-popup')) {
                    infoBox.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Error loading articles:', error);
        }
    }

    loadExcelData();
});
