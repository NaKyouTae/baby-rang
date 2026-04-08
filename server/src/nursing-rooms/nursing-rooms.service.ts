import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNursingRoomReportDto {
  name?: string;
  type?: string;
  sido?: string;
  sigungu?: string;
  roadAddress?: string;
  detailLocation?: string;
  tel?: string;
  dadAvailable?: boolean;
  facilities?: string[];
  openHours?: string;
  notes?: string;
  reporterName?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class NursingRoomsService {
  constructor(private prisma: PrismaService) {}

  async createReport(dto: CreateNursingRoomReportDto, userId?: string) {
    const name = dto.name?.trim();
    const sido = dto.sido?.trim();
    const roadAddress = dto.roadAddress?.trim();
    if (!name || !sido || !roadAddress) {
      throw new BadRequestException('이름, 광역시/도, 도로명 주소는 필수입니다.');
    }

    return this.prisma.nursingRoomReport.create({
      data: {
        userId: userId ?? null,
        name,
        type: dto.type?.trim() || '기타',
        sido,
        sigungu: dto.sigungu?.trim() || null,
        roadAddress,
        detailLocation: dto.detailLocation?.trim() || null,
        tel: dto.tel?.trim() || null,
        dadAvailable: !!dto.dadAvailable,
        facilities: Array.isArray(dto.facilities) ? dto.facilities : [],
        openHours: dto.openHours?.trim() || null,
        notes: dto.notes?.trim() || null,
        reporterName: dto.reporterName?.trim() || null,
        lat: typeof dto.lat === 'number' ? dto.lat : null,
        lng: typeof dto.lng === 'number' ? dto.lng : null,
      },
    });
  }

  async geocode(query: string) {
    const q = (query || '').trim();
    if (!q) return { items: [] };
    const apiKey = process.env.KAKAO_CLIENT_ID;
    if (!apiKey) {
      throw new BadRequestException('Kakao REST API 키가 설정되지 않았습니다.');
    }

    // 1) 주소 검색 (유사 검색 허용)
    const addrRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&analyze_type=similar&size=10`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } },
    );
    // 2) 키워드 검색 (건물명/상호명)
    const kwRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=10`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } },
    );

    if (!addrRes.ok) {
      const text = await addrRes.text().catch(() => '');
      console.error('[kakao address]', addrRes.status, text);
    }
    if (!kwRes.ok) {
      const text = await kwRes.text().catch(() => '');
      console.error('[kakao keyword]', kwRes.status, text);
    }

    if (!addrRes.ok && !kwRes.ok) {
      throw new BadRequestException(
        'Kakao Local API 호출이 실패했습니다. KAKAO_CLIENT_ID가 REST API 키인지, 해당 앱에 카카오맵(Local API) 사용 설정이 되어 있는지 확인하세요.',
      );
    }

    const addrData: any = addrRes.ok ? await addrRes.json() : { documents: [] };
    const kwData: any = kwRes.ok ? await kwRes.json() : { documents: [] };

    const fromAddress = (addrData.documents ?? []).map((d: any) => {
      const road = d.road_address;
      const jibun = d.address;
      const roadAddress = road?.address_name || '';
      const jibunAddress = jibun?.address_name || '';
      const sido = road?.region_1depth_name || jibun?.region_1depth_name || '';
      const sigungu = road?.region_2depth_name || jibun?.region_2depth_name || '';
      return {
        roadAddress: roadAddress || jibunAddress,
        jibunAddress,
        sido,
        sigungu,
        lat: parseFloat(d.y),
        lng: parseFloat(d.x),
        placeName: '' as string,
      };
    });

    const fromKeyword = (kwData.documents ?? []).map((d: any) => ({
      roadAddress: d.road_address_name || d.address_name || '',
      jibunAddress: d.address_name || '',
      sido: '',
      sigungu: '',
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      placeName: d.place_name || '',
    }));

    // 같은 주소 중복 제거 (roadAddress + 좌표 기준)
    const seen = new Set<string>();
    const items = [...fromAddress, ...fromKeyword].filter((it) => {
      const key = `${it.roadAddress}|${it.lat}|${it.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { items };
  }

  async findApproved() {
    return this.prisma.nursingRoomReport.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
