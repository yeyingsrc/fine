package service

import (
	"fine/backend/db"
	"fine/backend/db/models"
	quakeModel "fine/backend/service/model/quake"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type QuakeDBService struct {
	dbConn *gorm.DB
}

func NewQuakeDBService() *QuakeDBService {
	return &QuakeDBService{dbConn: db.GetDBConnect()}
}

func (f *QuakeDBService) BatchInsert(taskID int64, items []quakeModel.RealtimeServiceItem) error {
	dbItems := make([]*models.Quake, 0)
	for _, item := range items {
		newItem := item //避免指针重复引用
		dbItems = append(dbItems, &models.Quake{
			RealtimeServiceItem: &newItem,
			TaskID:              taskID,
		})
	}
	if err := f.dbConn.Preload(clause.Associations).Create(&dbItems).Error; err != nil {
		return err
	}
	return nil
}

func (f *QuakeDBService) GetByTaskID(taskID int64) ([]*models.Quake, error) {
	items := make([]*models.Quake, 0)
	if err := f.dbConn.Preload("Service").Preload(clause.Associations).Where("task_id = ?", taskID).Find(&items).Error; err != nil {
		return items, err
	}
	return items, nil
}
